'use strict';
var inherits = require('util').inherits;

module.exports = ArangoError;

function ArangoError(obj) {
  this.message = obj.errorMessage;
  this.errorNum = obj.errorNum;
  this.code = obj.code;
  var err = new Error(this.message);
  err.name = this.name;
  if (err.fileName) this.fileName = err.fileName;
  if (err.lineNumber) this.lineNumber = err.lineNumber;
  if (err.columnNumber) this.columnNumber = err.columnNumber;
  if (err.stack) this.stack = err.stack;
  if (err.description) this.description = err.description;
  if (err.number) this.number = err.number;
}

inherits(ArangoError, Error);
ArangoError.prototype.name = 'ArangoError';
