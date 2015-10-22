'use strict';
export default function once(cb) {
  let called = false;
  return (...args) => {
    if (called) return;
    called = true;
    return cb(...args);
  };
}
