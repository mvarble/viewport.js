# viewport.js

Create [Cycle.js](https://cycle.js.org/) apps which render on the HTML Canvas intelligently.
This module creates a driver which renders to the canvas when provided a state stream from the app.
It also provides components which help interpret the mouse intent on the canvas, filtered according to the state provided to the driver.
The state is intended to be a [unist](https://github.com/syntax-tree/unist) tree with [frames.js](https://github.com/mvarble/frames.js) nodes, as these provide intuitive coordinate systems for encapsulating objects and relative positions thereof.
It is required that this `state` object has a `state.id` field, corresponding to the id attribute on the DOM object corresponding to the HTML Canvas.

## Example

Suppose I want to render my canvas to animate like the gif below,

![canvas example](https://raw.githubusercontent.com/mvarble/viewport.js/master/example.gif)

I would start by considering what the state looks like at any time.
For instance, I may choose that the state is as follows at the initial time,

```js
{
  type: 'root',
  id: 'canvas',
  width: 800,
  height: 200,
  children: [
    {
      type: 'textbox',
      data: { value: 'Seconds elapsed:' },
      worldMatrix: [[100, 0, 300], [0, -100, 100], [0, 0, 1]],
    },
    {
      type: 'textbox',
      worldMatrix: [[100, 0, 390], [0, -100, 100], [0, 0, 1]],
      data: { value: '0' },
    },
  }],
}
```

and acknowledge that only my `state.children[1].data.value` and `state.children[1].worldMatrix` will change.
My [Cycle.js](https://cycle.js.org/) app will now be as simple as

```js
const title = {
  type: 'textbox',
  data: { value: 'Seconds elapsed:' },
  worldMatrix: [[100, 0, 300], [0, -100, 100], [0, 0, 1]],
};
const startText = {
  type: 'textbox',
  worldMatrix: [[100, 0, 390], [0, -100, 100], [0, 0, 1]],
};

function app(sources) {
  // this is a timer that emits elapsed time at 24hz for 6 seconds.
  const time$ = xs.periodic(1000 / 24.).map(f => f/24.).take(6 * 24);

  // use the timer to edit the node in the tree responsible for the number
  // the node should revolve around the text once every 6-seconds.
  const text$ = time$.map(time => {
    const node = frames.rotatedFrame(startText, -time * 2 * Math.PI / 6, title);
    node.data = { value: '' + Math.floor(time) };
    return node;
  });

  // build the unist tree from the changing node
  const tree$ = text$.map(node => ({
    type: 'root',
    id: 'canvas',
    width: 800,
    height: 200,
    children: [title, node],
  }));

  // return the sink to the viewport driver
  return { viewport: tree$ };
}
```

and the driver will be given by

```js
const driver = makeViewportDriver(renderFunc);

function renderFunc(canvas, state) {
  const context = canvas.getContext('2d');
  context.fillStyle = 'white';
  context.fillRect(0, 0, 800, 200);
  const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  context.fillStyle = 'black';
  state.children.forEach(child => {
    const loc = frames.locFrameTrans([0, 0], child, { worldMatrix: identity });
    context.fillText(child.data.value, ...loc, 100, 100);
  });
}
```

Note that this app imported `xs` from [xstream](https://github.com/staltz/xstream) and `frames` from [frames.js](https://github.com/mvarble/frames.js).
Of course, the app can get as complicated as you want it to be.
The purpose of this project is to simply deal with the imperative rendering / resizing of the canvas, and sending appropriate data to the app.
It also includes components and utilities for making work like the example above more streamlined.

## API

### makeViewportDriver

This is the function which generates drivers to perform the desired renders on state changes.

```js
driver = makeViewportDriver(renderFunc [, vdomSelector])
```

The returned `driver` is a [Cycle.js](https://cycle.js.org/) driver which will perform the imperative renders as declared by `renderFunc`.
One provides the function `renderFunc` such that `renderFunc(canvas, state)` renders `state` on the DOM element `canvas`.
The driver is simply responsible for searching the dom for the canvas and running this function accordingly.

The driver also returns sources for the mounted app; the source will be an object with the following keys.

| tag | signature |
|---|---|
| mounted | Stream<id> | 
| resize | Stream<{ id, dims }> | 

The `mounted` stream will fire a value `id` corresponding to a value `state.id` that was provided to the driver and has been successfully found in the DOM by the driver.
The driver will repeatedly look for the appropriate DOM element for mounting purposes, so one may optimize searches by providing the optional argument `vdomSelector` to allow the driver to only observe a subset of the DOM tree for mutations.

The `resize` stream will fire for each DOM element that has been successfully mounted.
It will fire the [width, height] dimensions `[dims[0], dims[1]]` for the DOM element with id attribute `id` each time said element resizes.

### Utilities

#### relativeMousePosition

This function returns the mouse position relative to the target of the click event.

```js
pos = relativeMousePosition(event)
```

It uses `event.clientX` and `event.clientY` to understand how the mouse was placed, relative to `event.target`.
If one performs `relativeMousePosition(event)` for any event returned from a stream in the [MouseObject](#mouse-object) `drag` stream, it will instead get the position relative to `event.dragStart`, which is the `event.target` at the mousedown event that started the interior `drag` stream.

#### isOver

This is a function that determines if a mouse event occurs over a node.

```js
bool = isOver(event, node)
```

By inputting a mouse event `event` and [frame](https://github.com/mvarble/frames.js) `frame`, the result `bool` will be true if and only if the position of the mouse in `event` was *over* `frame`.

How one determines this *over* logic explicitly is by having `frame.data.clickBox` or `frame.data.clickBoxes`.
The `frame.data.clickBox` should be an array `[mx, my, Mx, My]`, which corresponds to a rectangle with corners `[mx, my]` and `[Mx, My]` in the *local* coordinates of `frame`.
It is assumed that the world coordinates are those of the canvas context.
If a click occurs in the rectangle of `frame.data.clickBox`, it will be true.
Otherwise, `frame.data.clickBoxes` is an arry of arrays of the form of `frame.data.clickBox`, and it will perform the same click logic on each of these.
Consequently, this function returns true if and only if the mouse position in `frame` coordinates is in one of the rectangles `frame.data.clickBox` or a child of `frame.data.clickBoxes`.

#### getOver

This is a that searches down the depth of a tree if any node in the state is under the mouse.

```js
nodeOrNull = getOver(event, tree)
```

When provided a mouse event `event` and [unist](https://github.com/syntax-tree/unist) tree `tree`, this function will search through `tree` using [unist-util-visit](https://github.com/syntax-tree/unist-util-visit) to see if any nodes were covered by the mouse, as according to the [isOver](#is-over) logic.
If a node was successful, the visiting utility cancels and proceeds to rerun on the successful node, until it finds the deepest descendent on which [isOver](#is-over) was true.
The function will return this deepest descendent or `null` if no node of `tree` was under the mouse.

### Components

#### MouseObject

This is a component which takes a DOM element and extracts streams associated to different mouse intents, like single/double clicks and dragging.

```js
mouse = MouseObject(viewport)
```

The inputted `viewport` should have a `viewport.events` method, as exported by the factory [Cycle.js](https://cycle.js.org/) DOMDriver.
From here, mouse object will have things like `mouse.click` which is an alias for the `viewport.events('click')`, along with some other interpretted streams that do not correspond to the usual DOM events.
A summary of the `mouse` fields is below.

| tag | summary |
|---|---|
| click | corresponding to the `click` event |
| mousemove |  corresponding to the `mousemove` event | 
| mouseleave |  corresponding to the `mouseleave` event | 
| wheel |  corresponding to the `wheel` event | 
| mousedown |  corresponding to the `mousedown` event | 
| mouseup |  corresponding to the `mouseup` event | 
| lMousedown |  the `mousedown` event, filtered for left-clicks | 
| lMouseup |  the `mouseup` event, filtered for left-clicks | 
| rMousedown |  the `mousedown` event, filtered for right-clicks | 
| rMouseup |  the `mouseup` event, filtered for right-clicks | 
| mMousedown |  the `mousedown` event, filtered for middle-clicks | 
| mMouseup |  the `mouseup` event, filtered for middle-clicks | 
| singleclick |  the `click` events, filtered by appropriate timing and little movement | 
| doubleclick |  the `click` events, filtered by those that happened in quick succession | 
| drag |  this is a stream of streams; each stream will be `mousemove` events and a terminating `mouseup` event that follow when one is holding the mouse down. | 

#### FilteredMouse

This component is responsible for filtering mouse streams to those that correspond to a specific child of a node in the state.

```js
filteredMouse = FilteredMouse(mouse, node)
```

By inputting a [MouseObject](#mouse-object) `mouse` and a [frame](https://github.com/mvarble/frames.js) `node`, one will get a `filteredMouse`, which can be seen as the original `mouse`, along with a new `filteredMouse.select` method.
By running `childMouse = filteredMouse.select(key)`, one will receive a new [MouseObject](#mouse-object) `childMouse` corresponding to the streams of `mouse`, filtered to those in which the position of the mouse was over the child in `node.children` with `child.key` matching the provided `key`.
The filtering logic is performed by the [isOver](#is-over) function.

#### KilledMouse

This component is responsible for putting a lifecycle on mouse streams.

```js
killedMouse = KilledMouse(mouse, end)
```

By inputting a [MouseObject](#mouse-object) `mouse` and stream `end`, the user will get `killedMouse`, another [MouseObject](#mouse-object), such that `killedMouse.stream = mouse.stream.endWhen(end)` for each `stream` tag in the [MouseObject](#mouse-object).
If `mouse` was a [FilteredMouse](#filtered-mouse), the `killedMouse.select` method will also only return streams which end when `end` fires.
