# viewport.js

It seems like [Cycle.js](https://cycle.js.org/) does not have an API for declarative canvas rendering, so this package creates a simple component in lieu of such functionality.
The power of [Snabbdom](https://github.com/snabbdom/snabbdom) allows us to do this easily though their hook API.

This package provides a function called `Viewport` which is our component of signature

```js
({ render, renderState, vdom }) => newVdom
```

where `render` is a stream of functions of signature `(HTMLCanvas, object) => void` which correspond to the imperative rendering of the canvas, `renderState` is the state which will be provided into the render function's second argument, and `vdom` is a stream of Snabbdom canvas elements that this component uses to create the new output stream `newVdom`.

In essence, one can think of this component as using `renderState` to thunk a hook `vnode => render(vnode.elm, renderState)` and bind it to `newVdom`.
This is effectively what is done in practice, except it creates a new vdom with matching selector and data for patching purposes.
