/**
 * driver.js
 *
 * This module exports the function which creates a driver for cycle.js apps
 * which require interaction frames in a canvas.
 */

// module dependencies: npm packages
import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import dropRepeats from 'xstream/extra/dropRepeats';
import pairwise from 'xstream/extra/pairwise';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';
import fromEvent from 'xstream/extra/fromEvent';

/**
 * makeViewportDriver
 *
 * This returns a viewportDriver for rendering elements on the canvas.
 * 
 * The inputs are as follows:
 *   renderState: A function of signature (HTMLCanvas, frameTree) => void
 *     that is performed on every state update
 *   vdomSelector: This is a string corresponding to a document selector that is
 *     used in the case that the viewport canvas elements are inside a vdom.
 *     If "undefined," it will simply use the document.
 *
 * This driver simply takes in streams of frame trees with "id" identifiers,
 * and uses this stream to draw to the canvas bearing the appropriate id.
 * It also returns functions associated to the resize events of the canvas,
 * as these are the only ones that are not handled immediately by the DOMDriver.
 *
 * Isolation is implemented so that an isolated component only sees resize 
 * events associating to the canvas bearing the appropriate id.
 */
const keyCount = obj => Object.keys(obj).length;
const isDefined = obj => typeof obj !== 'undefined';

function makeViewportDriver(renderState, vdomSelector) {
  // stream: mutations of the vdom
  const mutations$ = xs.create({
    start: listener => {
      if (!document) return;
      const observer = new MutationObserver(() => listener.next());
      if (vdomSelector) {
        const dom = document.querySelector(vdomSelector);
        observer.observe(dom, { childList: true, subtree: true });
      } else {
        observer.observe(document, { childList: true, subTree: true });
      }
    },
    stop: () => {},
  });

  // create the driver
  const viewportDriver = state$ => {
    // listener: resize canvas and render it as according to state
    state$.addListener({
      next: state => {
        const canvas = document.getElementById(state.id);
        if (canvas && canvas.getContext) {
          canvas.width = state.width;
          canvas.height = state.height;
          renderState(canvas, state);
        }
      },
    });

    // stream: store all the most recent states
    const store$ = state$.filter(state => state && state.id)
      .fold((acc, state) => ({
        ...acc, 
        [state.id]: state,
      }), {})
      .drop(1);

    /**
     * stream: a stream of an object with keys being id's of viewports and 
     * fields being the associated canvases. This is fired any canvases show up
     */
    const newViewport$ = store$
      .compose(dropRepeats((a, b) => keyCount(a) === keyCount(b)))
      .mapTo(undefined);

    const domChange$ = xs.merge(newViewport$,  mutations$)
      .compose(sampleCombine(store$))
      .map(([_, store]) => Object.keys(store).reduce((acc, id) => {
        const canvas = document.getElementById(id);
        return canvas ? { ...acc, [id]: canvas } : { ...acc };
      }, {}))
      .filter(obj => Object.keys(obj).length > 0)
      .compose(dropRepeats((a, b) => keyCount(a) === keyCount(b)))

    // domChangeList$ will return the subset of domChange$ of which there were
    // changes, in a list
    const domChangeList$ = xs.merge(
      domChange$.take(1).map(obj => Object.keys(obj).map(id => ({
        id,
        canvas: obj[id],
      }))),
      domChange$.compose(pairwise).map(([a, b]) => (
        Object.keys(b).reduce((acc, id) => {
          if (isDefined(a[id])) return acc;
          return [...acc, { id, canvas: b[id] }];
        }, [])
      ))
    ).filter(list => list.length > 0);

    /**
     * stream: This stream is a derivative of the domChange$ and window resizes;
     * it sends an array of objects of the form { id, dims } where "id" is a
     * viewport id of which the parent dimensions have changed and "dims" is 
     * said dimensions. This is checked every time the domChange$ fires or 
     * window resizes.
     */
    const windowResize$ = window ? fromEvent(window, 'resize') : xs.empty();
    const resizesRaw$ = xs.combine(
      domChange$, 
      xs.merge(xs.of(undefined), windowResize$)
    ).map(([canvasesObj, _]) => Object.keys(canvasesObj).reduce((acc, id) => {
        const canvas = canvasesObj[id];
        const { offsetWidth, offsetHeight } = canvas.parentNode;
        return { ...acc, [id]: [offsetWidth, offsetHeight] };
      }, {}));
    const resizes$ = xs.merge(
      resizesRaw$.take(1).map(a => (
        Object.keys(a).reduce((acc, id) => [...acc, { id, dims: a[id] }], [])
      )),
      resizesRaw$.compose(pairwise).map(([a, b]) => (
        Object.keys(b).reduce((acc, id) => {
          if (!isDefined(a[id])) return [...acc, { id, dims: b[id] } ];
          if (a[id][0] === b[id][0] && a[id][1] === b[id][1]) return acc;
          return [...acc, { id, dims: b[id] }];
        }, [])
      ))
    );

    // the sink fields: no isolation
    const resizeNoIsolate$ = resizes$.map(list => xs.fromArray(list)).flatten();
    const mountedNoIsolate$ = domChangeList$
      .map(list => xs.fromArray(list.map(obj => obj.id)))
      .compose(flattenConcurrently);

    // the sink fields: isolation
    const getResizeIsolate = id => resizes$
      .map(list => list.find(obj => obj.id === id))
      .filter(isDefined);
    const getMountedIsolate = id => domChangeList$
      .map(list => list.find(obj => obj.id === id))
      .filter(isDefined);

    return {
      resize: resizeNoIsolate$,
      mounted: mountedNoIsolate$,
      isolateSource: (viewport, id) => ({
        resize: getResizeIsolate(id),
        mounted: getMountedIsolate(id),
      }),
      isolateSink: (sink, id) => sink,
    };
  }
  return viewportDriver;
}
export { makeViewportDriver };
