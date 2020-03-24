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
export { Viewport, makeViewportDriver };

// these are boolean functions that help us determine the state of a snabbdom
// vnode
function isRenderable(vnode) {
  if (typeof document === 'undefined') return false;
  return (
    vnode
    && vnode.elm 
    && document.body.contains(vnode.elm)
  );
}

function alreadyHasHook(vnode) {
  return (
    vnode.data
    && vnode.data.hook
    && vnode.data.hook.insert
  );
}

/**
 * Viewport:
 *
 * This is a simple component that appends a hook to the relevant snabbdom and
 * prepares a stream for the ViewportDriver.
 */
function Viewport({ state, canvas, render }) {
  const viewport$ = xs.combine(state, canvas, render)
    .map(([stateObject, vdom, renderFunc]) => {
      // if there is no vdom, we cannot do anything
      if (!vdom) return undefined;

      // if there is a ready vdom, we simply pile everything together
      if (isRenderable(vdom)) { return [stateObject, vdom, renderFunc]; }

      // if the vdom is not ready, we need to add render hooks on every update
      if (alreadyHasHook(vdom)) {
        if (!vdom.data.viewport) {
          const thunk = vdom.data.hook.insert;
          vdom.data.viewport = vnode => render(vnode.elm, state);
          vdom.data.hook.insert = function (vnode) {
            thunk(vnode);
            vnode.data.viewport(vnode);
          };
        } else {
          vdom.data.viewport = vnode => render(vnode.elm, state);
        }
      } else {
        if (!vdom.data) { vdom.data = {}; }
        if (!vdom.data.hook) { vdom.data.hook = {}; }
        vdom.data.viewport = vnode => render(vnode.elm, state);
      }
      return [stateObject, vdom, renderFunc];
    }).filter(obj => obj);

  // we return the (possibly adapted) DOM and viewport streams
  return { 
    DOM: viewport$.map(v => v[1]),
    viewport: viewport$,
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
    const next = ([state, vnode, render]) => {
      if (isRenderable(vnode)) {
        render(vnode.elm, state);
        return;
      }
    };

    // add render callback as listener
    viewport$.addListener({ next });

    // return the FrameSource
    return new UnmountedFrameSource(viewport$.map(v => v[0]), isDeep);
  }

  return driver;
}

/**
 * UnmountedFrameSource
 *
 * An instance of this class is returned by the ViewportDriver.
 */
class UnmountedFrameSource {
  constructor(state$, isDeep) {
    this._state$ = state$;
    this._isDeep = isDeep;
  }

  mount(domSource) {
    return new FrameSourceMaster(domSource, this._state$, this._isDeep);
  }

  events() {
    throw new Error('You need to mount a `DOMSource` before requesting streams')
  }

  parentDims() {
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
  constructor(domSource, state$, isDeep) {
    this._domSource = domSource;
    this._state$ = state$;
    this._isDeep = isDeep;
    this._parsedStreams = {};
    if (typeof window !== 'undefined') {
      this._resizes$ = xs.merge(xs.of(undefined), fromEvent(window, 'resize'));
    }
  }

  /**
   * this is a wrapper of the `DOMSource.events` method, with the added 
   * information of which frame `getOver(event, frame, isOver)` returned
   */
  events(type) {
    if (!this._parsedStreams[type]) {
      this._parsedStreams[type] = this._domSource.events(type)
        .compose(sampleCombine(this._state$))
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

  /**
   * this will return a stream of the parent's `offset*` dimensions on resize
   */
  parentDims() {
    if (this._dimensions$) {
      return this._dimensions$;
    } else {
      this._prepDimensions();
      return this._dimensions$ ? adapt(this._dimensions$) : adapt(xs.empty());
    }
  }

  /**
   * simple helper function
   */
  _prepDimensions() {
    if (this._dimensions$ || typeof window === 'undefined') return;
    if (!this._resizes$) {
      this._resizes$ = xs.merge(xs.of(undefined), fromEvent(window, 'resize'));
    }

    this._dimensions$ = xs.combine(this._domSource.element(), this._resizes$)
      .filter(([el]) => el && el.parentNode)
      .map(([el]) => [el.parentNode.offsetWidth, el.parentNode.offsetHeight])
      .compose(dropRepeats(([a, b], [c, d]) => a == c && b == d));
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

  parentDims() {
    return this._master.parentDims();
  }
}
