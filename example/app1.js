/**
 * App 1: Drag the earth/sun.
 */

const xs = require('xstream').default;
const { h } = require('@cycle/dom');
const {
  translatedFrame,
  rotatedFrame,
  identityFrame,
  locFrameTrans,
  vecFrameTrans,
} = require('@mvarble/frames.js');
const sampleCombine = require('xstream/extra/sampleCombine').default;
const { Viewport, createDrag, relativeMousePosition } = require('../index');

// our export
module.exports = app;

/**
 * state stuff
 */
const initialState = {
  type: 'root',
  width: 256,
  height: 256,
  children: [
    {
      type: 'window',
      worldMatrix: [[128, 0, 128], [0, -128, 128], [0, 0, 1]],
    },
    {
      type: 'circle',
      key: 'yellow',
      worldMatrix: [[25, 0, 128], [0, -25, 128], [0, 0, 1]],
      data: { clickDisk: [0, 0, 1] },
      children: [{
        type: 'circle',
        key: 'blue',
        worldMatrix: [[10, 0, 128], [0, -10, 26], [0, 0, 1]],
        data: { clickDisk: [0, 0, 1] },
      }],
    }
  ],
}

const rotateYellow = (state, event) => {
  const clickPos = relativeMousePosition(event);
  const yellowFrame = state.children[1];
  const blueFrame = yellowFrame.children[0];
  const bluePos = locFrameTrans([0, 0], blueFrame, yellowFrame);
  const newPos = locFrameTrans(clickPos, identityFrame, yellowFrame);
  const theta = Math.sign(det(bluePos, newPos)) * angle(bluePos, newPos);
  return { 
    ...state, 
    children: [
      state.children[0],
      rotatedFrame(yellowFrame, theta)
    ],
  };
}

const shiftYellow = (state, event) => ({
  ...state,
  children: [
    state.children[0],
    translatedFrame(
      state.children[1],
      [event.movementX, event.movementY],
      identityFrame,
    ),
  ]
});

const update = (state, event, click) => (
  click === 'yellow' ? shiftYellow(state, event) : rotateYellow(state, event)
);

/**
 * view stuff
 */
function parseCircle(circleFrame) {
  const [x, y] = locFrameTrans([0, 0], circleFrame, identityFrame);
  const r1 = norm(vecFrameTrans([1, 0], circleFrame, identityFrame));
  const r2 = norm(vecFrameTrans([0, 1], circleFrame, identityFrame));
  return { x, y, r1, r2, color: circleFrame.key };
};

function render(canvas, state) {
  // if state doesn't have width/height, we are not ready for render
  // otherwise, update canvas size accordingly
  const { width, height } = state;
  if (!width || !height) return;
  canvas.width = width;
  canvas.height = height;

  // get the canvas context and clear it.
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);

  // parse the circles
  const circles = [
    state.children[1],
    state.children[1].children[0],
  ].map(parseCircle);

  // draw the circles
  circles.forEach(({ x, y, r1, r2, color }) => {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x + r1, y);
    [ ...(new Array(25)) ].forEach((_, i) => context.lineTo(
      x + r1 * Math.cos(i * 2 * Math.PI / 25),
      y + r2 * Math.sin(i * 2 * Math.PI / 25),
    ));
    context.lineTo(x + r1, y);
    context.fill();
  });
};

/**
 * our app
 */
function app({ DOM, state, viewport }) {
  // parse clicks between yellow and blue
  const frameSource = viewport.mount(DOM.select('canvas'));
  const mousedown$ = frameSource
    .select(frame => frame && frame.type === 'circle')
    .events('mousedown');
  const intent$ = createDrag(mousedown$)
    .flatten()
    .filter(event => event && event.isDrag && event.isDrag.frame)
    .map(event => ({ event, click: event.isDrag.frame.key }));

  // our reducer sets the state
  const reducer$ = intent$
    .map(({ event, click }) => (state => update(state, event, click)))
    .startWith(() => initialState);

  // our canvas is a declarative function of the state
  const canvas$ = xs.of(h('canvas', {
    style: { background: '#666' },
    attrs: { width: 256, height: 256 },
  }));
  const viewportSink = Viewport({
    DOM,
    state: state.stream,
    canvas: canvas$,
    render: xs.of(render),
  });

  // return our sink
  return {
    viewport: viewportSink.viewport,
    DOM: viewportSink.DOM,
    state: reducer$,
  };
}


/**
 * utilities
 */

function norm([a, b]) {
  return Math.pow(Math.pow(a, 2) + Math.pow(b, 2), 0.5);
}

function angle([a, b], [c, d]) {
  return Math.acos((a * c + b * d) / (norm([a, b]) * norm([c, d])));
}

function det([a, b], [c, d]) {
  return (a * d - b * c);
}
