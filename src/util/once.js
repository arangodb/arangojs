'use strict';
export default function once(cb) {
  var called = false;
  return function (...args) {
    if (called) return;
    called = true;
    return cb(...args);
  };
};
