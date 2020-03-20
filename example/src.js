const Viewport = require('../index').default;
const xs = require('xstream').default;
const run = require('@cycle/run').run;
const { makeDOMDriver, h } = require('@cycle/dom');
const withState = require('@cycle/state').withState;

const renderFunc = (canvas, { x, y, r }, color) => {
  const { width, height } = canvas;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.clearRect(0, 0, width, height);
  context.beginPath();
  context.moveTo(x + r, y);
  [ ...(new Array(100)) ].forEach((_, i) => context.lineTo(
    x + r * Math.cos(i * 2 * Math.PI / 100),
    y + r * Math.sin(i * 2 * Math.PI / 100),
  ));
  context.lineTo(x + r, y);
  context.fill();
}

const app = ({ DOM, state }) => {
  const reducer$ = DOM.select('input').events('input').map(e => (obj => ({
    ...obj,
    [e.target.name]: parseFloat(e.target.value),
  }))).startWith(() => ({ x: 50, y: 50, r: 5 }));

  const formDom$ = state.stream.map(({ x, y, r }) => h('div', [
    h('input', { 
      props: { name: 'r', type: 'range', min: 5, max: 20, value: r || 5 },
    }),
    h('input', {
      props: { name: 'x', type: 'range', min: 0, max: 100, value: x || 50 },
    }),
    h('input', { 
      props: { name: 'y', type: 'range', min: 0, max: 100, value: y || 50 },
    }),
  ]));

  const render$ = xs.periodic(5000).take(1).startWith(1)
    .map(i => i ? 'red' : 'blue')
    .map(color => (canvas, state) => renderFunc(canvas, state, color));

  const canvas$ = Viewport({
    render: render$,
    renderState: state.stream,
    vdom: xs.of(h('canvas', {
      props: { width: 100, height: 100 },
      hook: {
        insert: () => console.log('I still want to be called!'),
        postpatch: () => console.log('I do, too!'),
      },
    })),
  });

  const dom$ = xs.combine(formDom$, canvas$).map(array => h('div', array));

  return {
    DOM: dom$, 
    state: reducer$,
  };
}

run(withState(app), {
  DOM: makeDOMDriver('#app'),
  debug: l$ => l$.addListener({ next: console.log }),
});
