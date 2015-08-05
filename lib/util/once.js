'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = once;

function once(cb) {
  var called = false;
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (called) return;
    called = true;
    return cb.apply(undefined, args);
  };
}

;
module.exports = exports['default'];