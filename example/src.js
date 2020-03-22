const xs = require('xstream').default;
const sampleCombine = require('xstream/extra/sampleCombine').default;
const run = require('@cycle/run').run;
const { makeDOMDriver, h } = require('@cycle/dom');
const withState = require('@cycle/state').withState;
const {
  identityFrame,
  rotatedFrame,
  translatedFrame,
  locFrameTrans,
} = require('@mvarble/frames.js');
const {
  Viewport,
  ViewportParser,
  createDrag,
  relativeMousePosition,
} = require('../index');

/**
 * state management:
 *
 * we use a frame as the state to showcase the click utilities.
 */
const initialFrame = {
  type: 'circle',
  key: 'yellow',
  worldMatrix: [[30, 0, 250], [0, 30, 250], [0, 0, 1]],
  data: { clickDisk: [0, 0, 1] },
  children: [{
    type: 'circle',
    key: 'blue',
    worldMatrix: [[5, 0, 250], [0, 5, 100], [0, 0, 1]],
    data: { clickDisk: [0, 0, 1] },
  }]
}

const norm = ([a, b]) => Math.pow(Math.pow(a, 2) + Math.pow(b, 2), 0.5);

const angle = ([a, b], [c, d]) => (
  Math.acos((a * c + b * d) / (norm([a, b]) * norm([c, d])))
);

const det = ([a, b], [c, d]) => (a * d - b * c);

const rotateYellow = (state, event) => {
  const clickPos = relativeMousePosition(event);
  const bluePos = locFrameTrans([0, 0], state.children[0], state);
  const newPos = locFrameTrans(clickPos, identityFrame, state);
  const theta = Math.sign(det(bluePos, newPos)) * angle(bluePos, newPos);
  return rotatedFrame(state, theta);
}

const shiftYellow = (state, event) => translatedFrame(
  state,
  [event.movementX, event.movementY],
  identityFrame,
);

const update = (state, event, click) => (
  click === 'yellow' ? shiftYellow(state, event) : rotateYellow(state, event)
);

/**
 * view: 
 *
 * this function will render the frame to the canvas.
 */
const parseCircle = circleFrame => {
  const M = circleFrame.worldMatrix.valueOf 
    ? circleFrame.worldMatrix.valueOf()
    : circleFrame.worldMatrix;
  return {
    x: M[0][2],
    y: M[1][2],
    r: norm([M[0][0], M[1][0]]),
    color: circleFrame.key,
  };
};

const render = (canvas, frame) => {
  // get the canvas context and clear it.
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);

  // parse the circles
  const circles = [frame, frame.children[0]].map(parseCircle);

  // draw the circles
  circles.forEach(({ x, y, r, color }) => {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x + r, y);
    [ ...(new Array(100)) ].forEach((_, i) => context.lineTo(
      x + r * Math.cos(i * 2 * Math.PI / 100),
      y + r * Math.sin(i * 2 * Math.PI / 100),
    ));
    context.lineTo(x + r, y);
    context.fill();
  });
};

/**
 * our app
 */
const app = ({ DOM, state }) => {
  // build a FrameSource with the ViewportParser
  const frameSource = ViewportParser({
    domSource: DOM.select('canvas'), 
    frame: state.stream
  });

  // parse clicks between yellow and blue
  const isCircle = frame => frame && frame.type === 'circle';
  const mousedown$ = frameSource.select(isCircle).events('mousedown').debug();
  const intent$ = createDrag(mousedown$).flatten()
    .filter(event => event && event.isDrag && event.isDrag.frame)
    .map(event => ({ event, click: event.isDrag.frame.key }))

  // our reducer sets the state
  const reducer$ = intent$
    .map(({ event, click }) => (state => update(state, event, click)))
    .startWith(() => initialFrame);

  // our canvas is a declarative function of the state
  const canvas$ = Viewport({
    render: xs.of(render),
    renderState: state.stream,
    vdom: xs.of(h('canvas', {
      props: { width: 500, height: 500 },
      style: { border: 'solid 3px black' },
      hook: {
        insert: () => console.log('I still want to be called!'),
        postpatch: () => console.log('I do, too!'),
      },
    })),
  });

  // return our sink
  return {
    DOM: canvas$, 
    state: reducer$,
  };
}

run(withState(app), {
  DOM: makeDOMDriver('#app'),
  log: l$ => l$.addListener({ next: console.log }),
});
