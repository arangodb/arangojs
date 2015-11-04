export default function promisify(Promise) {
  if (Promise === false) {
    return function (callback) {
      return {callback: callback || () => undefined};
    };
  }

  return function (callback) {
    if (callback || !Promise && !global.Promise) {
      return {callback: callback || () => undefined};
    }

    function defer(resolve, reject) {
      callback = (err, res) => {
        if (err) reject(err);
        else resolve(res);
      };
    }

    const promise = Promise ? new Promise(defer) : new global.Promise(defer);

    return {callback, promise};
  };
}
