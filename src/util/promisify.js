const noop = () => undefined;

export default function promisify(Promise) {
  if (Promise === false) {
    return function (callback) {
      return {callback: callback || noop};
    };
  }

  return function (callback) {
    if (callback || !Promise && !global.Promise) {
      return {callback: callback || noop};
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
