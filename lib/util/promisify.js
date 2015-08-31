'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = promisify;

function promisify(Promise) {
  if (Promise === false) {
    return function () {
      var callback = arguments.length <= 0 || arguments[0] === undefined ? function () {
        return undefined;
      } : arguments[0];

      return { callback: callback };
    };
  }

  return function () {
    var callback = arguments.length <= 0 || arguments[0] === undefined ? function () {
      return undefined;
    } : arguments[0];

    if (!Promise && !global.Promise) {
      return { callback: callback };
    }

    function defer(resolve, reject) {
      var errback = callback;
      callback = function (err, res) {
        if (err) reject(err);else resolve(res);
        if (errback) errback(err, res);
      };
    }

    var promise = Promise ? new Promise(defer) : new global.Promise(defer);

    return { callback: callback, promise: promise };
  };
}

;
module.exports = exports['default'];