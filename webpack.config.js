/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";
var resolve = require("path").resolve;
var webpack = require("webpack");

module.exports = {
  mode: "production",
  entry: ["regenerator-runtime/runtime", resolve(__dirname, "src/web.js")],
  devtool: "source-map",
  output: {
    path: resolve(__dirname, "build"),
    filename: "web.js",
    library: "arangojs",
    libraryTarget: "umd",
  },
  module: {
    rules: [
      // NOTE: these rules apply in reverse order
      {
        test: /\.(ts|js)$/,
        loader: "babel-loader",
      },
    ],
  },
  resolve: {
    extensions: [".web.js", ".web.ts", ".js", ".ts", ".json"],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": { NODE_ENV: '"production"' },
    }),
  ],
};
