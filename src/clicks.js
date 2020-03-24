/**
 * clicks.js
 *
 * This module exports utilities that are useful for parsing click events
 * of a canvas.
 */

// module dependencies: npm packages
import xs from 'xstream';
import fromEvent from 'xstream/extra/fromEvent';
import visit from 'unist-util-visit';
import { locFrameTrans, identityFrame } from '@mvarble/frames.js';

// our exports
export { relativeMousePosition, isOver, getOver, createDrag };

/**
 * relativeMousePosition:
 *
 * Function which returns the mouse position relative to the target of the click
 * event; if the appendended event at the `isDrag` attribute is existent, we 
 * use that target in the relative positioning
 */
function relativeMousePosition(event) {
  const target = event.isDrag ? event.isDrag.target : event.target;
  const rect = target.getBoundingClientRect();
  return [
    (event.clientX - rect.left) / (rect.right - rect.left) * target.width,
    (event.clientY - rect.top) / (rect.bottom - rect.top) * target.height,
  ];
};

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
  let node = null;
  visit(tree, frame => {
    if (isOver(event, frame)) {
      node = frame;
      return false;
    }
  });
  if (deep && node && node.children && node.children.length) {
    return getOver(event, { ...node, data: {} }, deep) || node;
  } else { 
    return node;
  }
}

/**
 * createDrag
 *
 * This is a xstream operator that takes a stream of 'mousedown' events and 
 * returns a stream of streams that match the following diagram.
 *
 * mousedown: |-----x-------------------x------------->
 *
 * (createDrag)
 *
 * mousemove: |-x-------x--x-x----x------------------->
 * mouseup:   |----------------o-------------o-------->
 *
 * output:    |-----x-------------------x------------->
 *                   \                   \
 *                    --x--x-x-o-|        -----|
 *
 * Note that every stream starts with a 'mousedown' event, and ends with the 
 * 'mouseup' event. The streams will always output 'mousemove' and 'mouseup' 
 * events from the document (not by DOM element that triggered 'mousedown').
 * Note in the example above, we have that the output streams will be empty
 * if no 'mousemove' occurs between 'mousedown' and 'mouseup' events. Thus
 *   
 *   (1) Clicks are not drags
 *   (2) Every nonempty drag starts with a 'mousemove'.
 *   (3) Every nonempty drag ends with a 'mouseup'. 
 */
const appendDrag = (e, e1) => {
  e1.isDrag = e;
  return e1;
};

function createDrag(startStream$) {
  // if there is no document, we return an empty stream
  if (typeof document === 'undefined') return xs.empty();

  // create the output stream
  return startStream$.map(e => {
    const move$ = fromEvent(document, 'mousemove').map(e1 => appendDrag(e, e1));
    const up$ = fromEvent(document, 'mouseup').map(e1 => appendDrag(e, e1));
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
