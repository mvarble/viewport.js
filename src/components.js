/**
 * components.js
 *
 * This module exports the cycle.js components
 */

// module dependencies: npm packages
import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import fromEvent from 'xstream/extra/fromEvent';
import * as math from 'mathjs';

// module dependencies: project modules
import { isOver } from './utils';

/**
 * MouseObject
 *
 * This is a component which takes a DOM element and extracts streams associated
 * to different mouse intents, like single/double clicks and dragging.
 */

function MouseObject(viewport) {
  // we will build our sink as we go
  const sink = {};

  // create all the main events from the viewport
  sink.click = viewport.events('click');
  sink.mousemove = viewport.events('mousemove');
  sink.mouseleave = viewport.events('mouseleave');
  sink.wheel = viewport.events('wheel');
  sink.mousedown = viewport.events('mousedown');
  sink.mouseup = viewport.events('mouseup');
  sink.lMousedown = sink.mousedown.filter(e => e.which === 1);
  sink.lMouseup = sink.mouseup.filter(e => e.which === 1);
  sink.rMousedown = sink.mousedown.filter(e => e.which === 3);
  sink.rMouseup = sink.mouseup.filter(e => e.which === 3);
  sink.mMousedown = sink.mousedown.filter(e => e.which === 2);
  sink.mMouseup = sink.mouseup.filter(e => e.which === 2);
  sink.singleclick = sink.mousedown
    .map(downE => sink.click
      .endWhen(xs.periodic(250).take(1))
      .filter(upE => (
        math.chain([downE.clientX - upE.clientX, downE.clientY - upE.clientY])
          .abs().max().done() < 3
      ))
    )
    .flatten();
  sink.doubleclick = sink.mousedown
    .mapTo(sink.click.endWhen(xs.periodic(350).take(1)).drop(1))
    .flatten();
  sink.drag = sink.mousedown.compose(createDrag);
  // return the sink
  return sink;
}

function createDrag(startStream$) {
  const fakeEvent = (e, e1) => {
    e1.dragStart = e.target;
    return e1;
  };
  return startStream$.map(e => {
    const move$ = fromEvent(document, 'mousemove').map(e1 => fakeEvent(e, e1));
    const up$ = fromEvent(document, 'mouseup').map(e1 => fakeEvent(e, e1));
    return xs.create({
      start: listener => {
        let hasMoved = false;
        xs.merge(move$.endWhen(up$), up$.take(1)).addListener({
          next: e => {
            if (e.type === 'mousemove' || hasMoved) {
              hasMoved = true;
              listener.next(e);
            }
          },
          error: err => listener.error(err),
          complete: () => listener.complete(),
        });
      },
      stop: () => {}
    });
  });
}

export { MouseObject };

/**
 * FilteredMouse
 *
 * This component is responsible for filtering mouse streams to those that
 * correspond to a specific child of a node in the state. The component requires
 * an original `MouseObject` for the raw click streams and a stream of the node
 * in the state with which we care to identify which of its children have 
 * been clicked. It checks if a child is clicked on by using `isOver` as a 
 * filter. Consequently, it will not check any further down the tree for 
 * descendents' clicks.
 *
 * Its sources are:
 *   - mouse: The sink of a `MouseObject`
 *   - node: A stream of the node with which we care identify which of its
 *      children have been clicked.
 *
 * Its sinks are:
 *   - ...mouse: all of the original mouse sources map through.
 *   - select: a function which performs the filtering based off of the children
 *      of node. If we want to filter the clicks on a specific child, said child
 *      needs to have a key associated to it. The `sink.select(key)` will then
 *      returned the filtered stream.
 */
function FilteredMouse({ mouse, node }) {
  // we return the inputted mouse stream with an additional selection function
  const sink = { ...mouse };

  // this will parse mouse streams
  const parseMouseStream = stream$ => stream$.compose(sampleCombine(node))
    .map(([event, node]) => {
      if (!node || !node.children || !node.children.length) {
        return { key: undefined, out: event };
      }
      const clickedChild = node.children.find(c => isOver(event, c));
      return {
        key: clickedChild ? clickedChild.key : undefined,
        out: event,
      }
    });

  // we now return the sink with the selector
  const selectMouseStream = (stream$, key) => parseMouseStream(stream$)
    .filter(obj => obj.key === key)
    .map(obj => obj.out);
  sink.select = key => Object.keys(sink).reduce((acc, mouseKey) => {
    if (mouseKey === 'drag') {
      // drag only filters the mousedown, then proceeds to use the usual streams
      return {
        ...acc,
        drag: selectMouseStream(sink.mousedown, key).compose(createDrag),
      };
    } else if (mouseKey === 'select' ) {
      // if we for some reason passed a queryable MouseObject, don't include
      return acc;
    } else {
      // all other keys are filtered as usual
      return { ...acc, [mouseKey]: selectMouseStream(sink[mouseKey], key) };
    }
  }, {});
  return sink;
}

export { FilteredMouse };

/**
 * KilledMouse
 *
 * This is a component which takes a `MouseObject` and a stream `end` in order
 * to return a new `MouseObject` in which every mouse stream has an end
 * composed, as `stream.endWhen(end)`. If the inputted `MouseObject` was 
 * specifically a `FilteredMouseObject`, then the streams outputed by the select
 * method will also have the `endWhen` lifecycle.
 *
 * Sources:
 *   - mouse: a `MouseObject` or `FilteredMouseObject` which will be the source
 *      of the composed `endWhen` streams.
 *   - end: the stream which will mark the end of each stream of the 
 *      `MouseObject`
 *
 * Sinks:
 *   A `MouseObject` or `FilteredMouseObject`
 */
function KilledMouse({ mouse, end }) {
  // build the sink as we go
  let sink = {};

  // if the mouse has a selector, make all of the selectors have the same 
  // lifespan
  if (mouse.select) {
    sink.select = key => mouse.select(key).endWhen(end);
  }

  // remaining keys are all the same
  const keys = Object.keys(mouse).filter(k => k !== 'select');
  sink = {
    ...sink,
    ...keys.reduce((acc, k) => ({
      ...acc,
      [k]: mouse[k].endWhen(end),
    }), {}),
  };

  return sink;
} 
export { KilledMouse };
