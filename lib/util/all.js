/*jshint browserify: true */
"use strict";

module.exports = all;

function all(arr, callback) {
  var result = [],
    pending = arr.length,
    called = false;

  function step(i) {
    return function (err, res) {
      pending -= 1;
      if (!err) result[i] = res;
      if (!called) {
        if (err) callback(err);
        else if (pending === 0) callback(null, result);
        else return;
        called = true;
      }
    };
  }

  for (var i = 0; i < arr.length; i++) {
    arr[i](step(i));
  }
}