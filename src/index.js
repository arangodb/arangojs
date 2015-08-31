'use strict';
import Database from './database';

export default function construct(...args) {
  return new Database(...args);
}

export {Database};
