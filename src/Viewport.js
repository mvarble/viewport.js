/**
 * makeViewportDriver.js
 *
 * This module exports the Cycle.js driver which allows for declarative 
 * rendering on the canvas.
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
export { Viewport, makeViewportDriver, parentDims };

/**
 * parentDims:
 *
 * This is an xstream operator that will take a stream of elements, and return
 * a stream of [offsetWidth, offsetHeight] parent resizes.
 */
function parentDims(element$) {
  const resizes$ = xs.merge(xs.of(undefined), fromEvent(window, 'resize'));
  return xs.combine(element$, resizes$)
    .filter(([el]) => el && el.parentNode)
    .map(([el]) => [el.parentNode.offsetWidth, el.parentNode.offsetHeight])
    .compose(dropRepeats(([a, b], [c, d]) => a === c && b === d));
}


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
function Viewport({ DOM, state, canvas, render }) {
  const all$$ = xs.combine(state, canvas, render)
    .map(([stateObject, vdom, renderFunc]) => {
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
 * makeViewportDriver:
 *
 * This is a Cycle.js driver which allows us to have a queryable collection of
 * streams corresponding to parsed events on a canvas DOM element. These parsed
 * events will correspond to click events that occured over a given frame.
 * This is done by leveraging the streams of a `MainDOMSource` object from the
 * Cycle.js factory `DOMDriver`.
 */
function makeViewportDriver(isDeep) {
  isDeep = typeof isDeep === 'undefined' ? true : isDeep;

  function driver(viewport$) {
    // create the render callback 
    const next = ({ render, elm, state }) => {
      if (typeof document !== 'undefined' && document.body.contains(elm)) {
        render(elm, state);
      }
    };

    // add render callback as listener
    viewport$.addListener({ next });

    // return the FrameSource
    return new UnmountedFrameSource(
      viewport$.map(obj => ({ ...obj.state, scope: obj.scope })),
      isDeep,
    );
  }

  return driver;
}

/**
 * UnmountedFrameSource
 *
 * An instance of this class is returned by the ViewportDriver.
 */
const scopeSplit = '___';
const prependScope = (oldScope, scope) => (
  scope 
  ? ((!oldScope || oldScope === '') ? scope : scope + scopeSplit + oldScope)
  : oldScope
);
const appendScope = (oldScope, scope) => (
  scope 
  ? ((!oldScope || oldScope === '') ? scope : oldScope + scopeSplit + scope)
  : oldScope
);
const isolateSink = (sink, scope) => sink.map(viewport => ({
  ...viewport,
  scope: prependScope(viewport.scope, scope),
}));
class UnmountedFrameSource {
  constructor(state$, isDeep, scope) {
    this._state$ = state$;
    this._isDeep = isDeep;
    this._scope = scope || '';
    this.isolateSource = (source, scope) => {
      return new UnmountedFrameSource(
        source._state$,
        source._isDeep,
        appendScope(source._scope, scope),
      );
    };
    this.isolateSink = isolateSink;
  }

  mount(domSource) {
    return new FrameSourceMaster(
      domSource,
      this._state$,
      this._isDeep,
      this._scope,
    );
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
  constructor(domSource, state$, isDeep, scope) {
    this._domSource = domSource;
    this._state$ = state$;
    this._isDeep = isDeep;
    this._parsedStreams = {};
    this._scope = scope;

    if (typeof window !== 'undefined') {
      this._resizes$ = xs.merge(xs.of(undefined), fromEvent(window, 'resize'));
    }

    this.isolateSource = (source, scope) => {
      return new FrameSourceMaster(
        source._domSource,
        source._state$,
        source._isDeep,
        appendScope(source._scope, scope),
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
      // filter only the states within the scope
      const state$ = this._state$.filter(state => {
        if (this._scope === '') return true;
        if (!state.scope || !state.scope.includes) return false;
        return state.scope.slice(0, this._scope.length) === this._scope;
      });

      // leverage the DOMSource events
      this._parsedStreams[type] = this._domSource.events(type)
        .compose(sampleCombine(state$))
        .filter(([event, state]) => state.scope.includes(this._scope))
        .map(([event, state]) => {
          const frame = getOver(event, state, this._isDeep);
          event.frame = frame;
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
    return new FrameSource(this, selector)
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
  constructor(master, selector) {
    this._master = master;
    this._selector = selector;

    this.isolateSource = (source, scope) => {
      return new FrameSource(
        source._master.isolateSource(source._master, scope),
        source._selector
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
      frame => this._selector(frame) && selector(frame)
    )
  }

  events(type) {
    return this._master.events(type)
      .filter(e => e.frame && this._selector(e.frame));
  }
}
