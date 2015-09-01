'use strict';
import extend from 'extend';
import Database from './database';
import aqlQuery from './aql-query';

module.exports = extend(
  (...args) => new Database(...args),
  {
    Database,
    aqlQuery
  }
);
