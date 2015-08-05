'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});
var _bind = Function.prototype.bind;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _database = require('./database');

var _database2 = _interopRequireDefault(_database);

exports['default'] = function () {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new (_bind.apply(_database2['default'], [null].concat(args)))();
};

var Database = _database2['default'];
exports.Database = Database;