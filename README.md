# viewport.js

Create [Cycle.js](https://cycle.js.org/) apps which render on the HTML Canvas intelligently.
This module creates a driver which renders to the canvas when provided a state stream from the app.
It also provides components which help interpret the mouse intent on the canvas, filtered according to the state provided to the driver.
The state is intended to be a [unist](https://github.com/syntax-tree/unist) tree with [frame.js](https://github.com/mvarble/frames.js) nodes, as these provide intuitive coordinate systems for encapsulating objects and relative positions thereof.
It is required that this `state` object has a `state.id` field, corresponding to the id attribute on the DOM object corresponding to the HTML Canvas.

## Example

Suppose I want to render my canvas to look like the image below.

![canvas example](https://github.com/mvarble/viewport.js/blob/master/example.png),

but I would like that number `4` to change every second and rotate around the text at 10 rad/sec at a refresh rate of 60hz.
I would start by framing my state to look as follows.

```js
{
  type: 'root',
  id: 'canvas',
  width: 800,
  height: 200,
  children: [
    {
      type: 'textbox',
      data: { value: 'This is the time:' },
      worldMatrix: [[100, 0, 300], [0, -100, 100], [0, 0, 1]],
    },
    {
      type: 'textbox',
      worldMatrix: [[100, 0, 350], [0, -100, 150], [0, 0, 1]],
      data: { value: '4' },
    },
  }],
}
```

and acknowledge that only my `state.children[1].data.value` and `state.children[1].worldMatrix` will change.
My [Cycle.js](https://cycle.js.org/) app will now be as simple as

```js
const title = {
  type: 'textbox',
  data: { value: 'This is the time:' },
  worldMatrix: [[100, 0, 300], [0, -100, 100], [0, 0, 1]],
};
const startText = {
  type: 'textbox'
  worldMatrix: [[100, 0, 350], [0, -100, 150], [0, 0, 1]],
};

function app(sources) {
  const time$ = xs.periodic(1000).map(x => x + 4);
  const theta$ = xs.periodic(16.67).map(t => t/6.);
  const text$ = xs.combine(time$, theta$).map(([x, t]) => {
    const frame = frames.rotatedFrame(startText, t, title);
    frame.data = { value: '' + x };
    return frame;
  });
  const tree$ = text$.map(textNode => ({
    type: 'root',
    id: 'canvas',
    width: 800,
    height: 200,
    children: [title, textNode],
  }));
  return { viewport: tree$ };
}
```

and the driver will be given by

```js
const driver = makeViewportDriver(renderFunc);

function renderFunc(canvas, state) {
  const context = canvas.getContext('2d');
  const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  state.children.forEach(child => {
    const loc = frames.locFrameTrans([0, 0], child, { worldMatrix: identity });
    context.fillText(child.data.value, ...loc, 100, 100);
  })
}
```

Note that this app imported `xs` from [xstream](https://github.com/staltz/xstream) and `frames` from [frames.js](https://github.com/mvarble/frames.js).
Of course, the app can get as complicated as you want it to be.
The purpose of this project is to simply deal with the imperative rendering / resizing of the canvas, and sending appropriate data to the app.
It also includes components and utilities for making work like the example above more streamlined.

## API

TODO
