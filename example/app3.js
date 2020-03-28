/**
 * App 3: combining separate apps
 */

const xs = require('xstream').default;
const sampleCombine = require('xstream/extra/sampleCombine').default;
const { h } = require('@cycle/dom');
const { makeCollection } = require('@cycle/state');
const isolate = require('@cycle/isolate').default;
const { Viewport, createDrag } = require('../index');
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
  };
}

/**
 * our app
 */
function app({ DOM, viewport, state }) {
  // intent
  const click$ = DOM.select('button').events('click');
  const frameSource = viewport.mount(DOM.select('canvas'));

  // model
  const add$ = click$.compose(sampleCombine(state.stream))
    .map(([_, oldState]) => (state => ({
      ...state,
      children: [
        ...state.children, 
        createBox(colors[oldState.children.length]),
      ],
    })));
  const boxesSink = isolate(Boxes, { state: 'children', frameSource: null })({ 
    state,
    frameSource,
  });
  const reducer$ = xs.merge(add$, boxesSink.state)
    .startWith(() => ({ type: 'root', children: [] }));

  // view
  const canvas$ = xs.of(h('canvas', {
    attrs: { width: 256, height: 256 },
    style: { border: '3px solid black' },
  }));
  const render$ = boxesSink.render.map(renderFuncs => {
    return (canvas, state) => {
      canvas.getContext('2d').clearRect(0, 0, 256, 256);
      const L = renderFuncs.length;
      renderFuncs.slice().reverse().forEach((renderFunc, i) => {
        if (state.children && state.children[L-i-1]) {
          renderFunc(canvas, state.children[L-i-1]);
        }
      });
    };
  });
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
  const click$ = state.stream.map(box => (
    frameSource
    .select(frame => frame && frame.data.color === box.data.color)
    .events('mousedown')
  )).take(1).flatten();
  const drag$ = createDrag(click$).flatten();

  // model
  const reducer$ = drag$.map(event => (state => update(state, event)));

  // view
  const render$ = xs.of(renderBox)

  return {
    state: reducer$,
    render: render$
  };
}

function Boxes(sources) {
  return makeCollection({
    item: Box,
    itemKey: childState => childState.data.color,
    itemScope: key => ({ state: key, frameSource: null }),
    collectSinks: instances => ({
      state: instances.pickMerge('state'),
      render: instances.pickCombine('render'),
    }),
  })(sources);
}
