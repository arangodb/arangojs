/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";
const resolve = require("path").resolve;
const webpack = require("webpack");
const packageJson = require("./package.json");

module.exports = {
  mode: "production",
  entry: ["regenerator-runtime/runtime", resolve(__dirname, "src/web.js")],
  devtool: "source-map",
  output: {
    path: resolve(__dirname, "build"),
    filename: "web.js",
    library: { name: "arangojs", type: "umd" },
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
      "process.env": {
        NODE_ENV: '"production"',
        ARANGOJS_VERSION: `"${packageJson.version}"`,
      },
    }),
  ],
};
