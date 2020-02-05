/**
 * driver.js
 *
 * This module exports the function which creates a driver for cycle.js apps
 * which require interaction frames in a canvas.
 */

/**
 * makeViewportDriver
 *
 * This returns a viewportDriver for rendering elements on the canvas.
 * 
 * The input is a function of signature (HTMLCanvas, frameTree) => void
 * that is performed on every state update
 *
 * The returned driver simply takes in streams of `frame.js` trees with root 
 * node having fields:
 * {
 *   canvas: HTMLCanvas,
 *   width: desired width (int),
 *   height: desired height (int)
 * }
 * The canvas can be obtained by the cycle DOMDriver via 
 * `DOM.select(tag).element()` or simply by a `document.getElement*` functions.
 *
 */

function makeViewportDriver(renderState) {
  return state$ => {
    state$.addListener({
      next: state => {
        // use `getContext` to identify if the object is in fact an HTMLCanvas
        if (state.canvas && state.canvas.getContext) {
          if (state.width && state.height) {
            state.canvas.width = state.width;
            state.canvas.height = state.height;
          }
          renderState(state.canvas, state);
        }
      },
    });
  }
}

export { makeViewportDriver };
