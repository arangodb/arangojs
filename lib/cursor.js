/*jshint browserify */
"use strict";

var extend = require('extend'),
  promisify = require('promisify');

module.exports = ArrayCursor;

function ArrayCursor(connection, body) {
  this._connection = connection;
  this._result = body.result;
  this._hasMore = Boolean(body.hasMore);
  this._id = body.id;
  this._current = 0;
}

extend(ArrayCursor.prototype, {
  all: function (callback) {},
  next: function (callback) {},
  hasNext: function () {
    return (this._hasMore || (this._current + 1) < this._result.length);
  },
  forEach: function (callback) {},
  every: function (callback) {},
  some: function (callback) {},
  map: function (callback) {},
  reduce: function (callback) {}
});
