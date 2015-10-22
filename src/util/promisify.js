'use strict';
export default function promisify(Promise) {
  if (Promise === false) {
    return function (callback = () => undefined) {
      return {callback};
    };
  }

  return function (callback = () => undefined) {
    if (!Promise && !global.Promise) {
      return {callback};
    }

    function defer(resolve, reject) {
      const errback = callback;
      callback = (err, res) => {
        if (err) reject(err);
        else resolve(res);
        if (errback) errback(err, res);
      };
    }

    const promise = Promise ? new Promise(defer) : new global.Promise(defer);

    return {callback, promise};
  };
}
