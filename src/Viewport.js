/**
 * Viewport.js
 *
 * This module exports the Cycle.js driver/component pair which allow for 
 * declarative rendering on the canvas.
 */

// module dependencies: npm packages
import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import dropRepeats from 'xstream/extra/dropRepeats';
import fromEvent from 'xstream/extra/fromEvent';
import { adapt } from '@cycle/run/lib/adapt';

// module dependencies: project modules
import { getOver } from './clicks';

// exports
export { Viewport, ViewportDriver };

// these are boolean functions that help us determine the state of a snabbdom
// vdom
function isRenderable(vdom) {
  if (typeof document === 'undefined') return false;
  return (
    vdom
    && vdom.elm 
    && document.body.contains(vdom.elm)
  );
}

function alreadyHasHook(vdom) {
  return (
    vdom.data
    && vdom.data.hook
    && vdom.data.hook.insert
  );
}

function withRenderHook(vdom, renderFunc, stateObject) {
  if (alreadyHasHook(vdom)) {
    if (!vdom.data.viewport) {
      const insert = vnode => {
        vdom.data.hook.insert(vnode);
        renderFunc(vnode.elm, stateObject);
      };
      const newVdom = {
        ...vdom,
        data: {
          ...vdom.data,
          hook: {
            ...vdom.data.hook,
            insert,
          },
          viewport: { oldInsert: vdom.data.hook.insert }
        },
      };
      return newVdom;
    } else {
      const insert = vnode => {
        if (vnode.data.viewport.oldInsert) {
          vnode.data.viewport.oldInsert(vnode);
        }
        renderFunc(vnode.elm, stateObject);
      };
      const newVdom = {
        ...vdom,
        data: {
          ...vdom.data,
          hook: {
            ...vdom.data.hook,
            insert,
          },
        },
      };
      return newVdom;
    }
  } else {
    const newVdom = { ...vdom };
    if (!newVdom.data) { newVdom.data = {}; }
    if (!newVdom.data.hook) { newVdom.data.hook = {}; }
    newVdom.data.viewport = { oldInsert: undefined };
    vdom.data.hook.insert = vnode => renderFunc(vnode.elm, stateObject);
    return newVdom;
  }
}

/**
 * Viewport:
 *
 * This is a simple component that appends a hook to the relevant snabbdom and
 * prepares a stream for the ViewportDriver.
 */
function Viewport({ DOM, state, canvas, render, parseDeep }) {
  const all$$ = xs.combine(state, canvas, render, parseDeep || xs.of(true))
    .map(([stateObject, vdom, renderFunc, isDeep]) => {
      // if there is no vdom, we cannot do anything
      if (!vdom) return xs.empty();

      // if there is a ready vdom, we simply pile everything together
      if (isRenderable(vdom)) { 
        return {
          vdom: xs.of(vdom),
          viewport: xs.of({
            render: renderFunc,
            state: stateObject,
            elm: vdom.elm,
            isDeep,
          }),
        };
      }

      // if the vdom is not ready, we need to add insert render hooks 
      const newVdom = withRenderHook(vdom, renderFunc, stateObject);
      
      // in the chance that the vdom has been patched and the object is already
      // in there. In such a case, take the most recent result of the element
      return {
        vdom: xs.of(newVdom),
        viewport: DOM.select(newVdom.sel).element().take(1).map(elm => ({
          render: renderFunc,
          state: stateObject,
          elm,
          isDeep,
        })),
      };
    })

  // we return the adapted DOM and viewport streams
  return { 
    DOM: all$$.map(obj => obj.vdom).flatten(),
    viewport: all$$.map(obj => obj.viewport).flatten(),
  };
}

/**
 * ViewportDriver:
 *
 * This is a Cycle.js driver which allows us to have a queryable collection of
 * streams corresponding to parsed events on a canvas DOM element. These parsed
 * events will correspond to click events that occured over a given frame.
 * This is done by leveraging the streams of a `MainDOMSource` object from the
 * Cycle.js factory `DOMDriver`.
 */
function ViewportDriver(viewport$) {
  // create the render callback 
  const next = ({ render, elm, state }) => {
    if (typeof document !== 'undefined' && document.body.contains(elm)) {
      render(elm, state);
    }
  };

  // add render callback as listener
  viewport$.addListener({ next });

  // return the FrameSource
  const state$ = viewport$.map(viewport => ({
    state: viewport.state,
    _scope: viewport._scope,
    isDeep: viewport.isDeep
  }));
  return new UnmountedFrameSource(state$);
}

/**
 * UnmountedFrameSource
 *
 * An instance of this class is returned by the ViewportDriver.
 */
const unmountedAncestryMessage = 'Do not isolate an `UnmountedFrameSource`' +
  'instance to a specific branch. Instead, mount this source first!';
class UnmountedFrameSource {
  constructor(state$, scope) {
    this._state$ = state$;
    this._scope = scope || [];
    this.isolateSource = (source, scope) => {
      const isolation = parseIsolationScope(scope);
      if (isolation.type3) return source; 
      if (isolation.type1) {
        return new UnmountedFrameSource(
          source._state$,
          appendScope(source._scope, isolation.type1),
        );
      }
      throw new Error(unmountedAncestryMessage);
    };
    this.isolateSink = isolateSink;
  }

  mount(domSource) {
    return new FrameSourceMaster(
      domSource,
      this._state$,
      this._scope,
    );
  }

  select() {
    throw new Error('You need to mount a `DOMSource` before filtering streams')
  }

  events() {
    throw new Error('You need to mount a `DOMSource` before requesting streams')
  }
}

/**
 * FrameSourceMaster
 *
 * Each `FrameSourceMaster` is in the context of some `DOMSource` and a stream 
 * of `frame.js` frames. It creates a wrapper of `DOMSource.events` and 
 * some additional methods which allow us to quickly parse the frame.
 */
class FrameSourceMaster {
  // our constructor
  constructor(domSource, state$, scope) {
    this._domSource = domSource;
    this._state$ = state$;
    this._scope = scope;
    this._parsedStreams = {};

    this.isolateSource = (source, scope) => {
      const isolation = parseIsolationScope(scope);
      if (isolation.type3) return source;
      if (isolation.type1) {
        return new FrameSourceMaster(
          source._domSource,
          source._state$,
          appendScope(source._scope, isolation.type1),
        );
      }
      return new FrameSource(
        source,
        () => true,
        [isolation.type2],
      );
    };

    this.isolateSink = isolateSink;
  }

  /**
   * this is a wrapper of the `DOMSource.events` method, with the added 
   * information of which frame `getOver(event, frame, isOver)` returned
   */
  events(type) {
    if (!this._parsedStreams[type]) {
      // filter the state immediately
      const state$ = this._state$
        .filter(({ _scope }) => withinScope(this._scope, _scope))

      // leverage the DOMSource events
      this._parsedStreams[type] = this._domSource.events(type)
        .compose(sampleCombine(state$))
        .map(([event, { state, isDeep }]) => {
          const { frame, treeKeys } = getOver(event, state, isDeep);
          event.frame = frame;
          event.treeKeys = treeKeys;
          return event;
        });
    }
    return adapt(this._parsedStreams[type]);
  }

  /**
   * this will return a `FrameSource` with the selector in place
   */
  select(selector) {
    if (typeof selector !== 'function') {
      throw new TypeError('`FrameSource.select` needs a function obj => bool');
      return;
    }
    return new FrameSource(this, selector, []);
  }

}

/**
 * FrameSource
 *
 * This class serves as a filtered `FrameSourceMaster`. The stream returned
 * by `FrameSource.parentDims` is identical, while that of `FrameSource.events`
 * will return only those events for which `event.frame` satisfies the 
 * `FrameSource.selector`, which is a function `frame => bool`.
 */
class FrameSource {
  constructor(master, selector, treeKeys) {
    this._master = master;
    this._selector = selector;
    this._treeKeys = treeKeys;

    this.isolateSource = (source, scope) => {
      const isolation = parseIsolationScope(scope);
      if (isolation.type3) return source;
      if (isolation.type1) {
        const master = new FrameSourceMaster(
          source._master._domSource,
          source._master._state,
          appendScope(source._master._scope, isolation.type1),
        );
        return new FrameSource(master, source._selector, source._treeKeys);
      }
      return new FrameSource(
        source._master,
        source._selector,
        appendScope(source._treeKeys, isolation.type2),
      );
    };

    this.isolateSink = isolateSink;
  }

  select(selector) {
    if (typeof selector !== 'function') {
      throw new TypeError('`FrameSource.select` needs a function obj => bool');
      return;
    }
    return new FrameSource(
      this._master,
      frame => this._selector(frame) && selector(frame),
      this._treeKeys,
    );
  }

  events(type) {
    return this._master.events(type).filter(event => (
      event
      && this._selector(event.frame)
      && withinScope(this._treeKeys, event.treeKeys)
    ));
  }
}

/**
 * isolation:
 *
 * For isolating ViewportDriver sources/sinks, we have two setups: (1) isolating
 * different viewports and (2) isolating frames within a single viewport.
 *
 * For (1), the source isolation is handled by having a simple string.
 *
 * isolate(SomethingWithViewport, 'someScope)
 *
 * This string is passed to the `_scope` attribute of the `FrameSource` instance
 * and the isolation is calculated normally.
 *
 * For (2), the source isolation is handled by the `FrameSource` object having
 * a single property `key`.
 *
 * isolate(SomeFrameComponent, { frameSource: { key: 'hisKey' } })
 * isolate(SomeFrameComponent, { frameSource: '{"key": "hisKey"}' })
 *
 * The intention of such isolation is that the `FrameSource` instance will store
 * an ancestry of all keys `[k1, k2, ..., kn]` added in its `_treeKeys` 
 * property. From there, the ancestry keys from `getOver` on each event will 
 * have to contain such isolation keys.
 *
 * Note that this isolation in (2) will only work if every frame in the 
 * unist tree has a `key` property.
 *
 * Lastly, no isolation of sinks happens in (2), as frames are not responsible
 * for returning their own viewports.
 */

function isNully(object) {
  const type = typeof object;
  return !object && type !== 'boolean' && type !== 'number';
}

const errorString = ( `ViewportDriver isolation requires:
  (1) a string for viewport scope,
  (2) an object with attribute 'key' for filtering clicks along the tree,
  (3) a 'null' or 'undefined' for neither.
`);

// this function will return an object corresponding to the data of (1) vs (2)
function parseIsolationScope(scope) {
  if (isNully(scope)) return { type3: true };
  if (scope && scope.key) return { type2: scope.key };
  try {
    // if JSON.parse works and the object has a key attribute, we assume (2)
    const object = JSON.parse(scope);
    if (typeof object.key === 'undefined') { throw new Error(errorString); }
    return { type2: object.key };
  } catch (error) {
    // otherwise, we are in (1), so simply pass the string
    if (error.name !== 'SyntaxError') { throw error; }
    return { type1: scope };
  }
}

// these functions will simply control string concatenation.
function prependScope(oldScope, scope) { return [scope, ...(oldScope || [])]; }
function appendScope(oldScope, scope) { return [...(oldScope || []), scope]; }

// we do not perform sink isolation in (2), as they should not be creating
// their own viewports.
function isolateSink(sink, scope) {
  const isolation = parseIsolationScope(scope);
  if (isolation.type1) {
    return sink.map(viewport => ({
      ...viewport,
      _scope: prependScope(viewport._scope, isolation.type1),
    }));
  } else {
    return sink;
  }
}

// This will see if the sourceScope array is a subset of the streamScope array.
// Such an event corresponds to the stream with the associated streamScope 
// "belonging" to the component with the associated sourceScope.
function withinScope(sourceScope, streamScope) {
  if (!sourceScope || !sourceScope.length) return true;
  if (!streamScope || !streamScope.length) return false;
  return streamScope.slice(0, sourceScope.length)
    .every((scope, i) => scope === sourceScope[i]);
}
