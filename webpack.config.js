'use strict'
const resolve = require('path').resolve
const webpack = require('webpack')

const alias = {}
alias[resolve(__dirname, 'src/util/byte-length.js')] = 'utf8-length'

module.exports = {
  entry: resolve(__dirname, 'src/index.js'),
  output: {
    path: __dirname,
    filename: 'arangojs.min.js'
  },
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel-loader'},
      {test: /\.json$/, loader: 'json-loader'}
    ]
  },
  resolve: {alias},
  target: 'web',
  externals: [],
  plugins: [
    new webpack.DefinePlugin({'process.env': {NODE_ENV: '"production"'}}),
    new webpack.optimize.OccurenceOrderPlugin(true),
    new webpack.optimize.UglifyJsPlugin({output: {comments: false}})
  ]
}
