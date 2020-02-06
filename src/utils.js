/**
 * utils.js
 *
 * This module exports utilities that are used
 */

// module dependencies: npm packages
import * as math from 'mathjs';
import xs from 'xstream';
import fromEvent from 'xstream/extra/fromEvent';
import dropRepeats from 'xstream/extra/dropRepeats';
import sampleCombine from 'xstream/extra/sampleCombine';
import visit from 'unist-util-visit';
import { locFrameTrans } from '@mvarble/frames.js';

/**
 * refreshReducer
 *
 * This is a function which produces a reducer stream corresponding to adding
 * a canvas to the app state. This is to be done when the app changes the DOM 
 * outside of the component's knowledge, and thus leaves the HTMLElement in the
 * app state stale.
 */
function refreshReducer(state$, canvas$) {
  return canvas$.compose(sampleCombine(state$))
    .filter(([_, { canvas }]) => !canvas || !document.body.contains(canvas))
    .map(([canvas]) => (tree => ({ ...tree, canvas })))
}
export { refreshReducer };

/**
 * mountCanvas
 * 
 * This is an `xtream` composition operator that takes a reducer stream and
 * returns a different reducer stream with the added manipulation that the 
 * most current canvas is mounted.
 */
function mountCanvas(canvas$) {
  return reducer$ => reducer$.compose(sampleCombine(canvas$))
    .map(([reducer, canvas]) => (tree => ({ ...reducer(tree), canvas })));
}
export { mountCanvas };

/**
 * parentSize
 *
 * This is an `xstream` composition operator that takes an HTMLCanvas stream
 * as input and returns a stream of the dimensions of its parent on output.
 */
function parentSize(canvas$) {
  return canvas$.map(canvas => {
    if (!canvas || !canvas.parentNode) return xs.empty();
    return xs.merge(xs.of(undefined), fromEvent(window, 'resize')).map(() => [
      canvas.parentNode.offsetWidth,
      canvas.parentNode.offsetHeight
    ]).compose(dropRepeats((a, b) => (a[0] == b[0] && a[1] == b[1])));
  });
}
export { parentSize };

/**
 * relativeMousePosition: 
 *
 * Function which returns the mouse position relative to the target of the click
 * event
 */
function relativeMousePosition(event) {
  const target = event.dragStart || event.target;
  const rect = target.getBoundingClientRect();
  return [
    (event.clientX - rect.left) / (rect.right - rect.left) * target.width,
    (event.clientY - rect.top) / (rect.bottom - rect.top) * target.height,
  ];
};
export { relativeMousePosition };

/**
 * isOver
 *
 * This is a function that determines by `node.data.clickBox` or 
 * `node.data.clickBoxes` if a mouse event occured over a `node`.
 */
function isOver(event, node) {
  if (!clickable(node)) return false;

  // get the mouse position
  const p = locFrameTrans(
    relativeMousePosition(event),
    { worldMatrix: math.identity(3) },
    node,
  );

  // check if in clickBoxes or clickBox
  const { data } = node;
  if (data.clickBoxes && data.clickBoxes.some(b => inBox(p, b))) return true;
  return data.clickBox ? inBox(p, data.clickBox) : false;
}

// helper functions
function inBox([x, y], [mX, mY, MX, MY]) {
  return (x >= mX && x <= MX && y >= mY && y <= MY);
}

function clickable(node) {
  // only nodes with coordinate systems and clickBoxes can receive clicks
  return (
    node.data 
    && node.worldMatrix 
    && (node.data.clickBox || node.data.clickBoxes)
  );
}

export { isOver };

/**
 * getOver
 *
 * This is a function that searches down the depth of a tree if any node in the
 * state has been clicked on. It uses `unist-util-visit` to run through the
 * tree, and it proceeds down any branch of which the node has a successful
 * `isOver` return.
 */
function getOver(event, tree) {
  let out = null;
  visit(tree, (node, index, parent) => {
    if (isOver(event, node)) {
      out = node;
      return false;
    }
  });
  out = (out && out.children && out.children.length)
    ? getOver(event, { ...out, data: {} }) || out
    : out;
  return out;
}

export { getOver };
