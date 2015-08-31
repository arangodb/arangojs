'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ArrayCursor = (function () {
  function ArrayCursor(connection, body) {
    _classCallCheck(this, ArrayCursor);

    this.extra = body.extra;
    this._connection = connection;
    this._api = this._connection.route('_api');
    this._result = body.result;
    this._hasMore = Boolean(body.hasMore);
    this._id = body.id;
    this._index = 0;
    this.count = body.count;
  }

  _createClass(ArrayCursor, [{
    key: '_drain',
    value: function _drain(cb) {
      var _this = this;

      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      this._more(function (err) {
        return err ? callback(err) : !_this._hasMore ? callback(null, _this) : _this._drain(cb);
      });
      return promise;
    }
  }, {
    key: '_more',
    value: function _more(callback) {
      var _this2 = this;

      if (!this._hasMore) callback(null, this);else {
        this._api.put('cursor/' + this._id, function (err, res) {
          if (err) callback(err);else {
            _this2._result.push.apply(_this2._result, res.body.result);
            _this2._hasMore = res.body.hasMore;
            callback(null, _this2);
          }
        });
      }
    }
  }, {
    key: 'all',
    value: function all(cb) {
      var _this3 = this;

      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      this._drain(function (err) {
        _this3._index = _this3._result.length;
        if (err) callback(err);else callback(null, _this3._result);
      });
      return promise;
    }
  }, {
    key: 'next',
    value: function next(cb) {
      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      function next() {
        var value = this._result[this._index];
        this._index += 1;
        callback(null, value);
      }
      if (this._index < this._result.length) next();else {
        if (!this._hasMore) callback(null);else {
          this._more(function (err) {
            return err ? callback(err) : next();
          });
        }
      }
      return promise;
    }
  }, {
    key: 'hasNext',
    value: function hasNext() {
      return this._hasMore || this._index < this._result.length;
    }
  }, {
    key: 'each',
    value: function each(fn, cb) {
      var _this4 = this;

      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      this._drain(function (err) {
        if (err) callback(err);else {
          try {
            var result = true;
            for (_this4._index = 0; _this4._index < _this4._result.length; _this4._index++) {
              result = fn(_this4._result[_this4._index], _this4._index, _this4);
              if (result === false) break;
            }
            callback(null);
          } catch (e) {
            callback(e);
          }
        }
      });
      return promise;
    }
  }, {
    key: 'every',
    value: function every(fn, cb) {
      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      function loop() {
        try {
          var result = true;
          while (this._index < this._result.length) {
            result = fn(this._result[this._index], this._index, this);
            this._index++;
            if (!result) break;
          }
          if (!this._hasMore || !result) callback(null, result);else {
            this._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      }
      this._index = 0;
      loop();
      return promise;
    }
  }, {
    key: 'some',
    value: function some(fn, cb) {
      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      function loop() {
        try {
          var result = false;
          while (this._index < this._result.length) {
            result = fn(this._result[this._index], this._index, this);
            this._index++;
            if (result) break;
          }
          if (!this._hasMore || result) callback(null, result);else {
            this._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      }
      this._index = 0;
      loop();
      return promise;
    }
  }, {
    key: 'map',
    value: function map(fn, cb) {
      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      var result = [];

      function loop(x) {
        try {
          while (this._index < this._result.length) {
            result.push(fn(this._result[this._index], this._index, this));
            this._index++;
          }
          if (!this._hasMore) callback(null, result);else {
            this._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      }
      this._index = 0;
      loop();
      return promise;
    }
  }, {
    key: 'reduce',
    value: function reduce(fn, accu, cb) {
      var _this5 = this;

      if (typeof accu === 'function') {
        cb = accu;
        accu = undefined;
      }

      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      function loop() {
        try {
          while (this._index < this._result.length) {
            accu = fn(accu, this._result[this._index], this._index, this);
            this._index++;
          }
          if (!this._hasMore) callback(null, accu);else {
            this._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      }
      if (accu !== undefined) {
        this._index = 0;
        loop();
      } else if (this._result.length > 1) {
        accu = this._result[0];
        this._index = 1;
        loop();
      } else {
        this._more(function (err) {
          if (err) callback(err);else {
            accu = _this5._result[0];
            _this5._index = 1;
            loop();
          }
        });
      }
      return promise;
    }
  }, {
    key: 'rewind',
    value: function rewind() {
      this._index = 0;
      return this;
    }
  }]);

  return ArrayCursor;
})();

exports['default'] = ArrayCursor;
module.exports = exports['default'];