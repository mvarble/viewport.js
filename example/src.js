const xs = require('xstream').default;
const sampleCombine = require('xstream/extra/sampleCombine').default;
const dropRepeats = require('xstream/extra/dropRepeats').default;
const { run } = require('@cycle/run');
const { timeDriver } = require('@cycle/time');
const { makeDOMDriver, h } = require('@cycle/dom');
const { withState } = require('@cycle/state');
const {
  withWorldMatrix,
  translatedFrame,
  rotatedFrame,
  transformedByMatrix,
  identityFrame,
  locFrameTrans,
  locsFrameTrans,
  vecFrameTrans,
  withRatio,
} = require('@mvarble/frames.js');
const {
  Viewport,
  makeViewportDriver,
  createDrag,
  relativeMousePosition,
} = require('../index');

/**
 * state management:
 *
 * we use a frame as the state to showcase the click utilities.
 */
const initialState = {
  type: 'root',
  children: [
    {
      type: 'window',
      worldMatrix: [[0.5, 0, 0.5], [0, -0.5, 0.5], [0, 0, 1]],
    },
    {
      type: 'circle',
      key: 'yellow',
      worldMatrix: [[0.2, 0, 0.5], [0, -0.2, 0.5], [0, 0, 1]],
      data: { clickDisk: [0, 0, 1] },
      children: [{
        type: 'circle',
        key: 'blue',
        worldMatrix: [[0.01, 0, 0.5], [0, -0.01, 0.1], [0, 0, 1]],
        data: { clickDisk: [0, 0, 1] },
      }],
    }
  ],
}

const norm = ([a, b]) => Math.pow(Math.pow(a, 2) + Math.pow(b, 2), 0.5);

const angle = ([a, b], [c, d]) => (
  Math.acos((a * c + b * d) / (norm([a, b]) * norm([c, d])))
);

const det = ([a, b], [c, d]) => (a * d - b * c);

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

const resizeState = (state, width, height) => {
  // get the old data
  const oldWidth = state.width || 1;
  const oldHeight = state.height || 1;

  // get the relative scale
  const scales = [width / oldWidth, height / oldHeight];
  const logScales = scales.map(s => Math.abs(Math.log(s)));
  const scale = scales[logScales.indexOf(Math.min(...logScales))];

  // scale the window
  const windowFrame = withWorldMatrix(
    state.children[0],
    [[width/2, 0, width/2], [0, -height/2, height/2], [0, 0, 1]],
  );

  // scale the plane relatively
  const yellow = transformedByMatrix(
    state.children[1],
    [
      [scale, 0, (width - oldWidth)/2],
      [0, scale, (height - oldHeight)/2],
      [0, 0, 1]
    ],
    { worldMatrix: [[1, 0, oldWidth/2], [0, 1, oldHeight/2], [0, 0, 1]] }
  );
  return { 
    type: 'root',
    width,
    height,
    children: [windowFrame, yellow]
  };
}

/**
 * view: 
 *
 * this function will render the frame to the canvas.
 */
const parseCircle = circleFrame => {
  const [x, y] = locFrameTrans([0, 0], circleFrame, identityFrame);
  const r1 = norm(vecFrameTrans([1, 0], circleFrame, identityFrame));
  const r2 = norm(vecFrameTrans([0, 1], circleFrame, identityFrame));
  return { x, y, r1, r2, color: circleFrame.key };
};

const render = (canvas, state) => {
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
const app = ({ DOM, state, viewport }) => {
  // parse clicks between yellow and blue
  const frameSource = viewport.mount(DOM.select('canvas'));
  const mousedown$ = frameSource
    .select(frame => frame && frame.type === 'circle')
    .events('mousedown')
  const intent$ = createDrag(mousedown$)
    .flatten()
    .filter(event => event && event.isDrag && event.isDrag.frame)
    .map(event => ({ event, click: event.isDrag.frame.key }));

  // our reducer sets the state
  const clickReducer$ = intent$
    .map(({ event, click }) => (state => update(state, event, click)));

  const resize$ = frameSource.parentDims()
    .map(([width, height]) => (state => resizeState(state, width, height)));

  const reducer$ = xs.merge(clickReducer$, resize$)
    .startWith(() => initialState);

  // our canvas is a declarative function of the state
  const canvas$ = xs.of(h('canvas', { style: { background: '#666' } }));

  // return our sink
  return {
    DOM: canvas$, 
    state: reducer$,
    viewport: xs.combine(state.stream, canvas$, xs.of(render)),
  };
}

run(withState(app), {
  DOM: makeDOMDriver('#app'),
  viewport: makeViewportDriver(),
});
