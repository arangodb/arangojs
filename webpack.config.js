'use strict'
var resolve = require('path').resolve
var webpack = require('webpack')

module.exports = {
  entry: resolve(__dirname, 'lib/index.js'),
  output: {
    path: __dirname,
    filename: 'arangojs.min.js',
    library: 'arangojs',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: /node_modules/,
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {NODE_ENV: '"production"'}
    }),
    new webpack.optimize.UglifyJsPlugin({
      minimize: true,
      output: {comments: false}
    })
  ]
}
