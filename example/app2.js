/**
 * App2: Drag box
 */

const xs = require('xstream').default;
const { h } = require('@cycle/dom');
const { createDrag } = require('@mvarble/viewport-utilities');
const { Viewport } = require('../index');
const {
  locsFrameTrans,
  identityFrame,
  translatedFrame,
} = require('@mvarble/frames.js');

// our export
module.exports = app;

/**
 * state stuff
 */
const initial = {
  type: 'draggable-box',
  worldMatrix: [[10, 0, 128], [0, -10, 128], [0, 0, 1]],
  data: { clickBox: [-1, -1, 1, 1] },
}

function update(state, event) {
  return translatedFrame(
    state,
    [event.movementX, event.movementY],
    identityFrame
  );
}

/**
 * view stuff
 */
function render(canvas, state) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 256, 256);
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

/**
 * our app
 */
function app({ DOM, viewport, state }) {
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
    DOM,
    state: state.stream,
    canvas: xs.of(h('canvas', { attrs: { width: 256, height: 256 } })),
    render: xs.of(render),
  });

  return {
    DOM: viewportSink.DOM,
    viewport: viewportSink.viewport,
    state: reducer$,
  };
}
