'use strict'
var resolve = require('path').resolve
var webpack = require('webpack')

module.exports = {
  entry: resolve(__dirname, 'src/index.js'),
  output: {
    path: __dirname,
    filename: 'arangojs.min.js'
  },
  module: {
    loaders: [
      {test: /index\.js$/, loader: 'expose?arangojs'},
      {test: /\.js$/, loader: 'babel-loader'},
      {test: /\.json$/, loader: 'json-loader'}
    ]
  },
  target: 'web',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {NODE_ENV: '"production"'},
      'Buffer': {byteLength: false}
    }),
    new webpack.optimize.OccurenceOrderPlugin(true),
    new webpack.optimize.UglifyJsPlugin({output: {comments: false}})
  ]
}
