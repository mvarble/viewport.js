/**
 * Viewport.js
 *
 * This module export the Cycle.js components which allow for declarative 
 * rendering on the canvas.
 */

// module dependencies: npm packages
import xs from 'xstream';
import { h } from '@cycle/dom';

// module dependencies: project modules
import { FrameSourceMaster } from './clicks';

// exports
export { Viewport, ViewportParser };

/* Viewport:
 * 
 * This function takes the sufficient data for the render, and returns a 
 * Snabbdom element with the appropriate render hooks bound. It has signature:
 *
 *   ({ render, renderState, vdom }) => vdom
 *
 * where `render` is a stream of functions of signature 
 *   
 *   (HTMLCanvas, object) => void 
 *
 * corresponding to the imperative render function called to draw on the canvas,
 * `renderState` is the state which will be provided into the render 
 * function's second argument, and `vdom` is a stream of Snabbdom canvas 
 * elements on which this component binds the appropriate render hooks.
 *
 * The render function hooks to the `insert` and `postpatch` hooks; if the 
 * provided snabbdom element has these hooks, it calls the render _after_ them.
 */
function Viewport({ render, renderState, vdom }) {
  return xs.combine(render, renderState, vdom)
    .filter(([render]) => typeof render === 'function')
    .map(([render, renderState, vdom]) => {
      // create the render hook from the `renderFunc` and `state`
      const renderHook = vnode => {
        if (!isRenderable(vnode)) return;
        render(vnode.elm, renderState);
      };

      // append this function to the appropriate hooks
      if (!vdom.data) { vdom.data = {} }
      if (!vdom.data.hook) { vdom.data.hook = {} }
      if (vdom.data.hook.insert) {
        const insert = vdom.data.hook.insert;
        vdom.data.hook.insert = vnode => { 
          insert(vnode); 
          renderHook(vnode); 
        };
      } else { dvom.data.hook.insert = renderHook; }
      if (vdom.data.hook.postpatch) {
        const postpatch = vdom.data.hook.postpatch;
        vdom.data.hook.postpatch = (oldVnode, vnode) => {
          postpatch(oldVnode, vnode);
          renderHook(vnode);
        };
      } else { vdom.data.hook.postpatch = (old, vnode) => renderHook(vnode); }

      // return the snabbdom vnode
      return h(vdom.sel, vdom.data, vdom.children || []);
    });
}

function isRenderable(vnode) {
  let renderable = false;
  try {
    renderable = vnode
      && vnode.elm 
      && document.body.contains(vnode.elm)
      && typeof vnode.elm.getContext === 'function';
  } catch (e) {
    if (e.name !== 'ReferenceError') throw e;
  }
  return renderable;
}

/**
 * ViewportParser:
 *
 * This is Cycle.js component which allows us to contextualize the events of a 
 * canvas DOM element in terms of the frame.js state it most recently 
 * represented in the render (assuming the provided streams coincide). Its 
 * signature is of the form:
 *
 * { domSource, frame, isDeep } => frameSource
 *
 * where `domSource` is a `DOMSource` object corresponding to the canvas DOM
 * object, `frame` is a stream of `frame.js` frames, `isDeep` is a stream of
 * booleans for the corresponding `getOver` function argument, and `frameSource` 
 * is a `FrameSourceMaster` instance.
 */
function ViewportParser({ domSource, frame, isDeep }) {
  return new FrameSourceMaster(domSource, frame, isDeep);
}
