/**
 * App 3: combining separate apps
 */

const xs = require('xstream').default;
const sampleCombine = require('xstream/extra/sampleCombine').default;
const { h } = require('@cycle/dom');
const { makeCollection } = require('@cycle/state');
const isolate = require('@cycle/isolate').default;
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
const colors = ['red', 'blue', 'green', 'yellow', 'orange'];

function createBox(color) {
  return {
    type: 'draggable-box',
    worldMatrix: [[10, 0, 128], [0, -10, 128], [0, 0, 1]],
    data: { clickBox: [-1, -1, 1, 1], color },
    key: color,
  };
}

/**
 * view stuff
 */

function render(canvas, state) {
  canvas.getContext('2d').clearRect(0, 0, 256, 256);
  state.children.slice(0).reverse().forEach(box => renderBox(canvas, box));
}


/**
 * our app
 */
function app({ DOM, viewport, state }) {
  // intent
  const click$ = DOM.select('button').events('click');

  // model
  const boxesSink = isolate(Boxes, { state: 'children', frameSource: null })({ 
    state,
    frameSource: viewport.mount(DOM.select('canvas')),
  });
  const add$ = click$.compose(sampleCombine(state.stream))
    .map(([_, oldState]) => (state => ({
      ...state,
      children: [
        ...state.children, 
        createBox(colors[oldState.children.length]),
      ],
    })));
  const reducer$ = xs.merge(add$, boxesSink.state)
    .startWith(() => ({ type: 'root', children: [] }));

  // view
  const canvas$ = xs.of(h('canvas', {
    attrs: { width: 256, height: 256 },
    style: { border: '3px solid black' },
  }));
  const render$ = xs.of(render);
  const viewportSink = Viewport({
    DOM,
    canvas: canvas$,
    state: state.stream,
    render: render$,
  });
  const dom$ = xs.combine(viewportSink.DOM, state.stream)
    .map(([canvas, state]) => h('div', [
      canvas,
      h('button', { attrs: { disabled: state.children.length == 5 } }, ['add']),
    ]));

  return {
    DOM: dom$,
    viewport: viewportSink.viewport,
    state: reducer$,
  };
}

/**
 * Box component
 */

/**
 * state stuff
 */
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

function renderBox(canvas, frame) {
  const context = canvas.getContext('2d');
  const points = locsFrameTrans(
    [[-1, -1], [1, -1], [1, 1], [-1, 1]],
    frame,
    identityFrame
  );
  context.fillStyle = frame.data.color;
  context.beginPath();
  context.moveTo(...points[0]);
  [1, 2, 3, 0].forEach(i => { context.lineTo(...points[i]); });
  context.fill();
  context.stroke();
}

function Box({ state, frameSource }) {
  // intent
  const drag$ = createDrag(frameSource.events('mousedown')).flatten();

  // model
  const reducer$ = drag$.map(event => (state => update(state, event)));

  return { state: reducer$ };
}

function Boxes(sources) {
  return makeCollection({
    item: Box,
    itemKey: childState => childState.data.color,
    itemScope: key => ({ state: key, frameSource: { key } }),
    collectSinks: instances => ({
      state: instances.pickMerge('state'),
    }),
  })(sources);
}
