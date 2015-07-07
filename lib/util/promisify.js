'use strict';
module.exports = function (PromiseCtor) {
  if (PromiseCtor === false) {
    return function () {
      var callback = arguments[0] === undefined ? function () {} : arguments[0];

      return { callback: callback };
    };
  }

  return function () {
    var callback = arguments[0] === undefined ? function () {} : arguments[0];

    if (!PromiseCtor && typeof Promise !== 'function') {
      return { callback: callback };
    }

    function defer(resolve, reject) {
      var errback = callback;
      callback = function (err, res) {
        if (err) reject(err);else resolve(res);
        if (errback) errback(err, res);
      };
    }

    var promise = PromiseCtor ? new PromiseCtor(defer) : new Promise(defer);

    return { callback: callback, promise: promise };
  };
};