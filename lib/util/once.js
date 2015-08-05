'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = once;

function once(cb) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    return cb.apply(undefined, arguments);
  };
}

;
module.exports = exports['default'];