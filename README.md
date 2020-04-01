# viewport.js

Declarative Cycle.js canvas rendering.

## Introduction

It seems like [Cycle.js](https://cycle.js.org/) does not have an API for declarative canvas rendering, so this package creates a little API for doing so.
The package also provides utilities for detecting clicks on the canvas and feeding them back into the application.
It does so by assuming that the canvas render is dependent on a [frames.js](https://github.com/mvarble/frames.js) state in which the world coordinates are those of the canvas.

## Example

An example of a draggable box is done below.
Note that we simply create an initial frame `initial`, the imperative rendering function `render`, and a reducer `update`;
from here, all of the intent of mouse clicks and rendering are handled with a concise API.

```js
const { run } = require('@cycle/run');
const { h, makeDOMDriver } = require('@cycle/dom');
const { withState } = require('@cycle/state');
const { 
  Viewport,
  ViewportDriver,
  createDrag,
} = require('@mvarble/viewport.js');
const {
  locsFrameTrans,
  identityFrame,
  translatedFrame,
} = require('@mvarble/frames.js');

const initial = {
  type: 'draggable-box',
  worldMatrix: [[10, 0, 250], [0, -10, 250], [0, 0, 1]],
  data: { clickBox: [-1, -1, 1, 1] },
}

function render(canvas, state) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 500, 500);
  const points = locsFrameTrans(
    [[-1, -1], [1, -1], [1, 1], [-1, 1]],
    state,
    identityFrame
  );
  context.fillStyle = 'red';
  context.beginPath();
  context.moveTo(...points[0]);
  [1, 2, 3, 0].forEach(i => { context.lineTo(...points[i]); });
  context.fill();
  context.stroke();
}

function update(state, event) {
  return translatedFrame(
    state,
    [event.movementX, event.movementY],
    identityFrame
  );
}

function main({ DOM, viewport, state }) {
  // intent
  const onBox$ = viewport.mount(DOM.select('canvas'))
    .select(frame => frame)
    .events('mousedown');
  const drag$ = createDrag(onBox$).flatten();

  // model
  const reducer$ = drag$
    .map(event => (state => update(state, event)))
    .startWith(() => initial);

  // view
  const viewportSink = Viewport({
    state: state.stream,
    canvas: xs.of(h('canvas', { attrs: { width: 500, height: 500 } })),
    render: xs.of(render),
  });

  return {
    DOM: viewportSink.DOM,
    viewport: viewportSink.viewport,
    state: reducer$,
  };
}

run(withState(main), {
  DOM: makeDOMDriver('#app'),
  viewport: ViewportDriver,
});
```

## API

Below we explain the API we use in examples like above.
Throughout, we refer to the *viewport* as the interactive canvas.

### Viewport

```js
viewportSink = Viewport({ state, canvas, render, isDeep })
```

This is a Cycle.js component that takes a state stream `state`, a snabbdom stream `canvas`, and a stream of imperative render functions `render`.
With these streams, it returns sink `viewportSink` with streams `viewportSink.viewport` and `viewportSink.DOM`.

The `viewportSink.viewport` stream exists to declare the render state for the [ViewportDriver](#viewportdriver).

The `viewportSink.DOM` stream is nothing but the original stream `canvas`, but an insert hook is appended for each update of `canvas` and `render` so that the appropriate render will occur on insertion.
This stream is to be used to build the DOM (as opposed to the original `canvas` stream) so that the render will still occur if the DOM element is not created by the time the `viewportSink.viewport` stream hits the `ViewportDriver`.

### ViewportDriver

```js
frameSource = ViewportDriver(viewport$)
```

This is a Cycle.js driver that takes a stream of the declared render data, performs the imperative render, and returns an object of queryable streams.

The input stream `viewport$` above is a stream of objects with the declared state of the viewport, the appropriate imperative render function, and the DOM handle
**You need not create these streams by hand**; you should let the [Viewport](#viewport) component handle generating these streams, with `viewport$ = viewportSink.viewport`.

The output object `frameSource` is an instance of the `UnmountedFrameSource` class.
If you would like to parse clicks on the canvas, you must start with leveraging the event queries of the `DOMDriver` by doing `frameSource.mount(DOM.select(cssSelector))`, where `cssSelector` is a tag suitable for identifying the canvas element on which you rendered, and `DOM` is a reference to the `MainDOMSource` exported by the `DOMDriver`.
The `UnmountedFrameSource.mount` method returns a (mounted) [FrameSource](#framesource), which can be used for parsing clicks on the canvas.

### FrameSource

The `FrameSource` has two methods of interest, `select` and `events`.

#### select, events

```js
frameSource.select(selector).events(eventType)
```

By calling `frameSource.select(selector)` for some function `selector` of signature `frame || undefined => bool`, you will get a new `frameSource` with the selector for future calls to `events`.
Once we have a `FrameSource` with a bunch of selectors, calling the method `frameSource.events(eventType)` will return a stream corresponding to `domSource.events(eventType)`, along with a two of things:

1. Each event will have the attribute `event.frame` appended to it, corresponding to the frame that was clicked on (as according to [getOver](#getover)).
2. The stream will be filtered to only include events that `event.frame` passes the selector built from `FrameSource.select`.

It is with these methods that you can *parse the clicks on the canvas*.
For instance, the example below creates click streams dependent on the nature of the object that was clicked on.

```js
const justCanvas$ = frameSource.select(f => !f).events('click');
const boxes$ = frameSource.select(f => f && f.type === 'box').events('click');
const disks$ = frameSource.select(f => f && f.type === 'disk').events('click');
```

#### isolation

Each `FrameSource` instance has `isolateSource/isolateSink` static functions which can be used in isolation in your apps.
It is intentionally set so that mounted `DOMSource` will not be isolated.
For instance, the following app design would be such that `SomeComponent` sees the clicks of the canvas element.
To not have this behavior, simply pass the `UnmountedFrameSource` instance and mount the isolated `DOM` in the component itself.

```js
function app({ viewport, DOM }) {
  const frame$ = xs.of(someFrame)
  const frameSource = viewport.mount(DOM.select('canvas'));
  const clicks$ = isolate(SomeComponent)({ frameSource, frame: state$ });
  return {
    DOM: xs.of(h('canvas')),
    log: clicks$,
  }
}

function SomeComponent({ frameSource, frame }) {
  // this will still trigger
  return frameSource.select(() => true).events('click');
}
```

Instead, isolation is done so that merged `viewportSink.viewport` streams can later be parsed by the ViewportDriver and subsequent isolated streams may be returned.

Additionally, it is reasonable to design components that do not create their own canvas, but rather use the streams from a `FrameSource` to declare new state updates / render functions.
We would like these objects to have their own isolation, despite having their own viewports.
To this end, we decided to have two types of isolation: (1) isolating separate viewports and (2) isolating components/frames within a viewport.

For (1), use strings as your isolation keys, while (2) should be an object of signature `{ key: anyComparableValue }`.
See the [example here](https://github.com/mvarble/viewport.js/blob/master/example/app3.js) to see how to interface with the [Cycle.js makeCollection API](https://cycle.js.org/api/state.html#cycle-state-source-usage-how-to-handle-a-dynamic-list-of-nested-components) to have collections of component-declared frames for building big unist trees.

### Utilities

Along with the component/driver pair that this package exports, we also have a couple of utilities that are repeatedly used in parsing clicks and resizes on the viewport.

#### relativeMousePosition

```js
[x, y] = relativeMousePosition(event)
```

This function calculates the bounding rectangle of the `event` target and calculates the mouse position relative to this.
If the `isDrag` attribute from [createDrag](https://github.com/mvarble/viewport-utilities#createdrag) is present in the event, `event.isDrag.target` is used instead of `event.target`.

#### isOver

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

#### getOver

```js
overObject = getOver(event, frame, deep)
```

This function will perform a breadth-first traversal through the inclusive descendants of `frame` and find one which satisfies the [isOver](#isover) condition.
If no such descendant exists, it returns `{ frame: null, treeKeys: [] }`.
If `deep` is false, the function will return `{ frame: someFrame, treeKeys: [k1, ..., kn] }`, where `someFrame` is the first frame that passed the `isOver` condition and `[k1, ..., kn]` is a list of the `ancestor.key` properties for inclusive ancestor of `someFrame`.
If `deep` is true, the function will return the same data type, but `someFrame` represents the farthest sibling down the branch with which `getOver` was repeatedly called for each successful frame in the `deep=false` version.
