/**
 * Viewport.js
 *
 * This module export the Cycle.js component which allows for declarative 
 * rendering on the canvas.
 */

// module dependencies: npm packages
import xs from 'xstream';
import { h } from '@cycle/dom';

// exports
export { Viewport };

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
