const path = require('path');
const webpack = require('webpack');

/**
 * Transpile ES6 to CommonJS
 */
webpack(
  {
    target: 'node',
    mode: 'production',
    entry: path.join(__dirname, 'src.js'),
    output: {
      path: __dirname,
      filename: 'index.js',
    },
    module: {
      rules: [
        { test: /.js$/, exclude: /(node_modules)/, use: 'babel-loader' }
      ],
    },
    resolve: { extensions: ['.js'] },
  },
  function (err, stats) {
    if (err) throw err;
    console.log(stats.toString({ colors: true }));
  }
);
