'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});
var _bind = Function.prototype.bind;
exports['default'] = construct;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _database = require('./database');

var _database2 = _interopRequireDefault(_database);

function construct() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new (_bind.apply(_database2['default'], [null].concat(args)))();
}

exports.Database = _database2['default'];