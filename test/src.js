import xs from 'xstream';
import { run } from '@cycle/run';
import { h, makeDOMDriver } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { makeViewportDriver, parentSize } from '../src/index';

const log = s$ => s$.addListener({ next: console.log });

function app(sources) {
  const sink1 = isolate(OuterComponent, 'OuterComponent1')({
    ...sources,
    dims: xs.of(undefined),
  });
  const sink2 = isolate(OuterComponent, 'OuterComponent2')({
    ...sources,
    dims: xs.of([690, 420]),
  });
  return {
    DOM: xs.combine(sink1.DOM, sink2.DOM).map(doms => h('div.app', doms)),
    viewport: xs.merge(sink1.viewport, sink2.viewport),
    log: xs.merge(sink1.viewport, sink2.viewport),
  };
}

function OuterComponent(sources) {
  const sink = isolate(InnerComponent, 'InnerComponent')(sources)
  const dom$ = xs.combine(sources.dims, sink.DOM).map(([ds, dom]) => ds
    ? h('div', { style: { width: `${ds[0]}px`, height: `${ds[1]}px` } }, [dom])
    : h('div', { style: { width: '100%', height: '200px' } }, [dom])
  );
  return {
    DOM: dom$,
    viewport: sink.viewport
  };
}

function InnerComponent(sources) {
  const dom$ = xs.of(h('canvas'));
  const canvas$ = sources.DOM.select('canvas').element().take(1);
  const resize$ = canvas$.compose(parentSize);
  const state$ = xs.combine(resize$, canvas$).map(([dims, canvas]) => ({
    canvas,
    width: dims[0],
    height: dims[1],
  }));
  return {
    DOM: dom$,
    viewport: state$,
  };
}

run(app, {
  viewport: makeViewportDriver(() => {}),
  DOM: makeDOMDriver('#app'),
  log,
})
