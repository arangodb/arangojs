/*jshint browserify */
"use strict";
var util = require('util');
module.exports = ArangoError;

function ArangoError(obj) {
  this.message = obj.errorMessage;
  this.errorNum = obj.errorNum;
  this.code = obj.code;
  var err = new Error(this.message);
  err.name = 'ArangoError';
  if (err.fileName) this.fileName = err.fileName;
  if (err.lineNumber) this.lineNumber = err.lineNumber;
  if (err.columnNumber) this.columnNumber = err.columnNumber;
  if (err.stack) this.stack = err.stack;
  if (err.description) this.description = err.description;
  if (err.number) this.number = err.number;
}

util.inherits(ArangoError, Error);