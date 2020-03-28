const xs = require('xstream').default;
const { withState } = require('@cycle/state');
const isolate = require('@cycle/isolate').default;
const { makeDOMDriver, h } = require('@cycle/dom');
const { run } = require('@cycle/run');
const { makeViewportDriver } = require('../index');
const app1 = require('./app1');
const app2 = require('./app2');
const componentApp = require('./app3');


function app(sources) {
  const s1 = isolate(app1, 'app1')(sources);
  const s2 = isolate(subApp, 'subApp')(sources);
  const s3 = isolate(componentApp, 'componentApp')(sources);
  const dom$ = xs.combine(s1.DOM, s2.DOM, s3.DOM).map(arr => h('div', [
    h('h1', ['testing isolation on standalone apps']),
    arr[0],
    arr[1],
    h('h1', ['testing complicated app']),
    arr[2],
  ]));
  return {
    DOM: dom$,
    state: xs.merge(s1.state, s2.state, s3.state),
    viewport: xs.merge(s1.viewport, s2.viewport, s3.viewport),
  };
}

function subApp(sources) {
  const s1 = isolate(app2, 'app2_1')(sources);
  const s2 = isolate(app2, 'app2_2')(sources);
  return {
    DOM: xs.combine(s1.DOM, s2.DOM).map(children => h('div#app-box', children)),
    state: xs.merge(s1.state, s2.state),
    viewport: xs.merge(s1.viewport, s2.viewport),
  };
}

run(withState(app), {
  DOM: makeDOMDriver('#app'),
  viewport: makeViewportDriver(),
  log: l$ => l$.addListener({ next: console.log }),
});
