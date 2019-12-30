/**
 * utils.js
 *
 * This module exports utilities that are used
 */

// module dependencies: npm packages
import * as math from 'mathjs';
import visit from 'unist-util-visit';
import { locFrameTrans } from '@mvarble/frames.js';

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

/**
 * Reducer Utilities
 *
 * These help manage reducers to be passed up the state tree
 */
function keyReducer(key) {
  return reducer$ => reducer$.map(reducer => ({ key, reducer }));
}

function liftReducers(reducer$$) {
  return reducer$$.compose(flattenConcurrently).map(({ key, reducer }) => (
    tree => {
      const treeCopy = { ...tree };
      const index = treeCopy.children.findIndex(c => c.key === key);
      if (index >= 0) {
        treeCopy.children[index] = reducer(treeCopy.children[index]);
      }
      return treeCopy;
    }
  ));
}
