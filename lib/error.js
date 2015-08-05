'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var ArangoError = (function (_Error) {
  function ArangoError(obj) {
    _classCallCheck(this, ArangoError);

    _get(Object.getPrototypeOf(ArangoError.prototype), 'constructor', this).call(this);
    this.name = 'ArangoError';
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

  _inherits(ArangoError, _Error);

  return ArangoError;
})(Error);

exports['default'] = ArangoError;
module.exports = exports['default'];