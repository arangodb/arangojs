"use strict";
var resolve = require("path").resolve;
var webpack = require("webpack");

module.exports = {
  entry: ["regenerator-runtime/runtime", resolve(__dirname, "src/index.js")],
  devtool: "source-map",
  output: {
    path: resolve(__dirname, "lib"),
    filename: "web.js",
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
                  browsers: ["> 2%", "ie 11"]
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
        options: {
          transpileOnly: true,
          compilerOptions: { target: "esnext" }
        }
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
      sourceMap: true,
      minimize: true,
      output: { comments: false }
    })
  ]
};
