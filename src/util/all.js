'use strict';
export default function all(arr, callback) {
  var result = [];
  var pending = arr.length;
  var called = false;

  if (arr.length === 0) return callback(null, result);

  function step(i) {
    return function (err, res) {
      pending -= 1;
      if (!err) result[i] = res;
      if (!called) {
        if (err) callback(err);
        else if (pending === 0) {
          if (result.every(r => r === undefined)) callback(null);
          else callback(null, result);
        }
        else return;
        called = true;
      }
    };
  }

  arr.forEach(function (fn, i) {
    fn(step(i));
  });
};
