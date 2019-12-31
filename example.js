const xs = require('xstream').default;
const frames = require('@mvarble/frames.js');
const { run } = require('@cycle/run');
const GIFEncoder = require('gifencoder');
const fs = require('fs');
const { createCanvas } = require('canvas');

const encoder = new GIFEncoder(800, 200);

encoder.createReadStream().pipe(fs.createWriteStream('example.gif'));
encoder.start();
encoder.setRepeat(0);
encoder.setDelay(1000/24.);
encoder.setQuality(10);

const canvas = createCanvas(800, 200);
const context = canvas.getContext('2d');

const title = {
  type: 'textbox',
  data: { value: 'Seconds elapsed:' },
  worldMatrix: [[100, 0, 300], [0, -100, 100], [0, 0, 1]],
};
const startText = {
  type: 'textbox',
  worldMatrix: [[100, 0, 390], [0, -100, 100], [0, 0, 1]],
};

function app(sources) {
  const time$ = xs.periodic(1000 / 24.).map(f => f/24.);
  const text$ = time$.map(time => {
    const node = frames.rotatedFrame(startText, -time * 2 * Math.PI / 6, title);
    node.data = { value: '' + Math.floor(time) };
    return node;
  }).take(6 * 24);
  const tree$ = text$.map(textNode => ({
    type: 'root',
    id: 'canvas',
    width: 800,
    height: 200,
    children: [title, textNode],
  }));
  return { viewport: tree$ };
}

const driver = state$ => {
  state$.addListener({ 
    next: state => {
      renderFunc(canvas, state);
      encoder.addFrame(context);
    }
  });
  state$.map(() => xs.periodic(1000).take(1)).flatten().addListener({
    next: () => {
      encoder.finish();
    },
  });
};

function renderFunc(canvas, state) {
  const context = canvas.getContext('2d');
  context.fillStyle = 'white';
  context.fillRect(0, 0, 800, 200);
  const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  context.fillStyle = 'black';
  state.children.forEach(child => {
    const loc = frames.locFrameTrans([0, 0], child, { worldMatrix: identity });
    context.fillText(child.data.value, ...loc, 100, 100);
  });
}

run(app, { viewport: driver });
