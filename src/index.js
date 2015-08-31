'use strict';
import extend from 'extend';
import Database from './database';

module.exports = extend(
  function construct(...args) {
    return new Database(...args);
  },
  {Database}
);
