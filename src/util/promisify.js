'use strict';
export default function (Promise) {
  if (Promise === false) {
    return function (callback = function () {}) {
      return {callback};
    };
  }

  return function (callback = function () {}) {
    if (!Promise && !global.Promise) {
      return {callback};
    }

    function defer(resolve, reject) {
      var errback = callback;
      callback = function (err, res) {
        if (err) reject(err);
        else resolve(res);
        if (errback) errback(err, res);
      };
    }

    var promise = Promise ? new Promise(defer) : new global.Promise(defer);

    return {callback, promise};
  };
};
