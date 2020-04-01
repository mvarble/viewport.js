/**
 * clicks.js
 *
 * This module exports utilities that are useful for parsing click events
 * of a canvas.
 */

// module dependencies: npm packages
import xs from 'xstream';
import fromEvent from 'xstream/extra/fromEvent';
import visit from 'unist-util-visit-parents';
import { locFrameTrans, identityFrame } from '@mvarble/frames.js';
import { relativeMousePosition } from '@mvarble/viewport-utilities';

// our exports
export { isOver, getOver };

/**
 * isOver
 *
 * This is a function that determines by `frame.data.clickDisk(s)` or
 * `frame.data.clickBox(es)` if a mouse event occured over a `frame`. 
 * We assume that the click coordinates are those of the world frame.
 */
function isOver(event, frame) {
  if (!clickable(frame)) return false;

  // get the mouse position
  const p = locFrameTrans(
    relativeMousePosition(event),
    identityFrame,
    frame,
  );

  // check if in clickBox(es) or clickDisk(s)
  const { data } = frame;
  if (data.clickBoxes && data.clickBoxes.some(b => inBox(p, b))) return true;
  if (data.clickDisks && data.clickDisks.some(d => inDisk(p, d))) return true;
  if (data.clickDisk && inDisk(p, data.clickDisk)) return true;
  return data.clickBox ? inBox(p, data.clickBox) : false;
}

// helper functions
function inBox([x, y], [mX, mY, MX, MY]) {
  return (x >= mX && x <= MX && y >= mY && y <= MY);
}

function inDisk([x, y], [h, k, r]) {
  return Math.pow(x-h, 2) + Math.pow(y-k, 2) <= Math.pow(r, 2);
}

function clickable(frame) {
  // only frames with coordinate systems and clickBoxes can receive clicks
  return (
    frame.data
    && frame.worldMatrix
    && (
      frame.data.clickBox 
      || frame.data.clickBoxes 
      || frame.data.clickDisk
      || frame.data.clickDisks
    )
  );
}

/**
 * getOver
 *
 * This is a function that searches down the depth of a tree if any frame in the
 * state has been clicked on. It uses `unist-util-visit` to run through the
 * tree, and it proceeds down any branch of which the frame has a successful
 * `isOver` return. It returns the node.
 */
function getOver(event, tree, deep) {
  let frame = null;
  let treeKeys = [];
  visit(tree, (node, ancestry) => {
    if (isOver(event, node)) {
      frame = node;
      treeKeys = ancestry.map(frame => frame.key).filter(key => key);
      return false;
    }
  });
  if (deep && frame && frame.children && frame.children.length) {
    const overData = getOver(event, { ...frame, data: {} }, deep);
    return (
      overData.frame
      ? { frame: overData.frame, treeKeys: [...treeKeys, ...overData.treeKeys] }
      : { frame, treeKeys: frame.key ? [ ...treeKeys, frame.key ] : treeKeys }
    );
  } else { 
    return {
      frame,
      treeKeys: (frame && frame.key) ? [ ...treeKeys, frame.key ] : treeKeys,
    };
  }
}

