# viewport.js

It seems like [Cycle.js](https://cycle.js.org/) does not have an API for declarative canvas rendering, so this package creates a little API for doing so.
I didn't want to rebuild the wheel and make a complicated driver, so I leveraged the power of the `DOMDriver` and the [Snabbdom](https://github.com/snabbdom/snabbdom) hook API.

The package also provides utilities for detecting clicks on the canvas and feeding them back into the application.
It does so by assuming that the canvas render is dependent on a [frames.js](https://github.com/mvarble/frames.js) state in which the world coordinates are those of the canvas.

# Viewport

```js
const newVdom$ = Viewport({ render, renderState, vdom });
```

This is a component where `render` is a stream of functions of signature `(HTMLCanvas, object) => void` which correspond to the imperative rendering of the canvas, `renderState` is the state which will be provided into the render function's second argument, and `vdom` is a stream of Snabbdom canvas elements that this component uses to create the new output stream `newVdom$`.

In essence, one can think of this component as using `renderState` to thunk a hook `vnode => render(vnode.elm, renderState)` and bind it to `newVdom`.
This is effectively what is done in practice, except it creates a new vdom with matching selector, data, and children for patching purposes.

# Click Utilities

## createDrag

```js
drag$ = createDrag(mousedown$)
```

This is a [xstream](https://github.com/staltz/xstream) operator that takes a stream of `mousedown` events and returns a stream of streams that match the following diagram.

```
mousedown: |-----x-------------------x------------->

        (createDrag)

mousemove: |-x-------x--x-x----x------------------->
mouseup:   |----------------o-------------o-------->

output:    |-----x-------------------x------------->
                   \                   \
                    --x--x-x-o-|        -----|
```

Note that every stream starts with a `mousedown` event, and ends with the `mouseup` event.
The streams will always output `mousemove` and `mouseup` events from the document, _not_ the DOM element that the `mousedown` events corresponded to.
However, each of these events will have an `isDrag` attribute which will point to the reference of the original `mousedown` event.
Also, these streams are not provided as arguments of the operator; they are just in the diagram for explanation.

Note in the example above, we have that the output streams will be empty if no `mousemove` occurs between 'mousedown' and 'mouseup' events.
The rationale behind this is that:

1. Clicks are not drags
2. Every nonempty drag starts with a 'mousemove'.
3. Every nonempty drag ends with a 'mouseup'. 


## relativeMousePosition

```js
[x, y] = relativeMousePosition(event)
```

This function calculates the bounding rectangle of the `event` target and calculates the mouse position relative to this.
If the `isDrag` attribute from [createDrag](#createdrag) is present in the event, `event.isDrag.target` is used instead of `event.target`.

## isOver

```js
bool = isOver(event, frame)
```
We consider `frame` _clickable_ if it has any of the following four attributes.

- `frame.data.clickBox`: Should be an array `[mx, my, Mx, My]` corresponding to a rectangle with vertices `[mx, my]` and `[Mx, My]` in `frame` coordinates.
- `frame.data.clickBoxes` Should be an array of arrays of the type above.
- `frame.data.clickDisk`: Should be an array `[h, k, r]` corresponding to a center `[h, k]` and a radius `r` of a disk in `frame` coordinates.
- `frame.data.clickDisks`: Should be an array of arrays of the type above.

This function checks each of these attributes of a clickable `frame` and sees if the location of the mouse in the associated objects.
The function returns true if and only if the mouse pointer is in at least one object.

## getOver

```js
overFrame = getOver(event, frame, deep)
```

This function will traverse through the inclusive descendants of `frame` and return one which satisfies the [isOver](#isover) condition.
If no such descendant exists, it returns `null`.
If `deep` is false, the function will return the (breadth-) inclusive descendant that satisfies the condition.
If `deep` is true, the function will follow down the branch of the first condition satisfier, and proceed similarly until there it reaches the last descendant which satisfies the condition.

## FrameSource

```js
frameSource = new FrameSource(domSource, frame$, isDeep, selector)
```

This class exists as a version of `DOMSource` that allows us to contextualize the events of a canvas DOM element in terms of a frame.js state.
By calling the method `FrameSource.events`, the user will get a stream of events fired by the canvas DOM element with attached frame metadata; the stream is filtered to only correspond to events on which the output of the [getOver](#getover) function match a provided `FrameSource.selector` function.
In a Cycle.js app, one uses the [ViewportParser](#viewport-parser) component to instantiate these.

## ViewportParser

```js
frameSource = ViewportParser({ domSource, frame, isDeep })
```

This is a Cycle.js component that allows us to parse the click intent of an interactive canvas that has rendered a frame.
By providing a `DOMSource` instance `domSource`, frame stream `frame`, and boolean stream `isDeep`, this component will return a [FrameSource](#frame-source) object allowing us to get the events.

# Example

These components were designed to be used as follows in a Cycle.js app.

```js
// we use the DOM.select API to create our FrameSource
const frameSource = ViewportParser({
  domSource: DOM.select('canvas'),
  frame: someFrameStream$,
});

// we get all mousedown events in which the mouse was clicking on a box
const mouse$ = frameSource
  .select(frame => frame.type === 'box')
  .events('mousedown');

// maybe we do some stuff with the mouse intent to change the state
// ...

// we declare the state of the render as according to the same parser stream
const vdom$ = Viewport({
  render: someRenderStream$,
  renderState: someFrameStream$,
  vdom: xs.of(h('canvas')),
});
```
