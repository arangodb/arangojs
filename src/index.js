'use strict';
import _Database from './database';
export default function (...args) {
  return new _Database(...args);
}
export var Database = _Database;
