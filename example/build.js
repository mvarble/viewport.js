const path = require('path');
const fs = require('fs');
const browserify = require('browserify');

const inFile = path.join(__dirname, 'src.js');
const outFile = path.join(__dirname, 'bundle.js');
const compile = browserify(inFile).bundle().pipe(fs.createWriteStream(outFile))

compile.on('finish', () => console.log(
  `Open file://${path.join(__dirname, 'index.html')} to see component work.`
))
