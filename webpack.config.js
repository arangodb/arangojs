"use strict";
var resolve = require("path").resolve;
var webpack = require("webpack");

module.exports = {
  entry: resolve(__dirname, "src/index.ts"),
  devtool: "source-map",
  output: {
    path: resolve(__dirname, "lib"),
    filename: "browser.js",
    library: "arangojs",
    libraryTarget: "umd"
  },
  module: {
    rules: [
      // NOTE: these rules apply in reverse order
      {
        test: /\.(ts|js)$/,
        loader: "babel-loader",
        options: {
          presets: [
            [
              "babel-preset-env",
              {
                target: {
                  browsers: ["last 2 versions", "ie >= 11"]
                }
              }
            ]
          ],
          plugins: [
            "babel-plugin-transform-class-properties",
            "babel-plugin-transform-object-rest-spread"
          ]
        }
      },
      {
        test: /\.ts/,
        loader: "ts-loader",
        options: { transpileOnly: true }
      }
    ]
  },
  resolve: {
    extensions: [".web.js", ".web.ts", ".js", ".ts", ".json"]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": { NODE_ENV: '"production"' }
    }),
    new webpack.optimize.UglifyJsPlugin({
      minimize: true,
      output: { comments: false }
    })
  ]
};
