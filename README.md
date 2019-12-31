# viewport.js

Create [Cycle.js](https://cycle.js.org/) apps which render on the HTML Canvas intelligently.
This module creates a driver which renders to the canvas when provided a state stream from the app.
It also provides components which help interpret the mouse intent on the canvas, filtered according to the state provided to the driver.
The state is intended to be a [unist](https://github.com/syntax-tree/unist) tree with [frames.js](https://github.com/mvarble/frames.js) nodes, as these provide intuitive coordinate systems for encapsulating objects and relative positions thereof.
It is required that this `state` object has a `state.id` field, corresponding to the id attribute on the DOM object corresponding to the HTML Canvas.

## Example

Suppose I want to render my canvas to animate like the gif below,

![canvas example](https://github.com/mvarble/viewport.js/blob/master/example.gif)

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

TODO
