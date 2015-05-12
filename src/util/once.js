'use strict';
module.exports = function once(cb) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    return cb.apply(this, arguments);
  };
};
