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
      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      var self = this;
      self._more(function (err) {
        if (err) callback(err);else if (!self._hasMore) callback(null, self);else self._drain(cb);
      });
      return promise;
    }
  }, {
    key: '_more',
    value: function _more(callback) {
      var self = this;
      if (!self._hasMore) callback(null, self);else {
        self._api.put('cursor/' + this._id, function (err, res) {
          if (err) callback(err);else {
            self._result.push.apply(self._result, res.body.result);
            self._hasMore = res.body.hasMore;
            callback(null, self);
          }
        });
      }
    }
  }, {
    key: 'all',
    value: function all(cb) {
      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      var self = this;
      self._drain(function (err) {
        self._index = self._result.length;
        if (err) callback(err);else callback(null, self._result);
      });
      return promise;
    }
  }, {
    key: 'next',
    value: function next(cb) {
      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      var self = this;
      function next() {
        var value = self._result[self._index];
        self._index += 1;
        callback(null, value);
      }
      if (self._index < self._result.length) next();else {
        if (!self._hasMore) callback(null);else {
          self._more(function (err) {
            if (err) callback(err);else next();
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
      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      var self = this;
      self._drain(function (err) {
        if (err) callback(err);else {
          try {
            var result;
            for (self._index = 0; self._index < self._result.length; self._index++) {
              result = fn(self._result[self._index], self._index, self);
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

      var self = this;
      function loop() {
        try {
          var result = true;
          while (self._index < self._result.length) {
            result = fn(self._result[self._index], self._index, self);
            self._index++;
            if (!result) break;
          }
          if (!self._hasMore || !result) callback(null, result);else {
            self._more(function (err) {
              if (err) callback(err);else loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      }
      self._index = 0;
      loop();
      return promise;
    }
  }, {
    key: 'some',
    value: function some(fn, cb) {
      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      var self = this;
      function loop() {
        try {
          var result = false;
          while (self._index < self._result.length) {
            result = fn(self._result[self._index], self._index, self);
            self._index++;
            if (result) break;
          }
          if (!self._hasMore || result) callback(null, result);else {
            self._more(function (err) {
              if (err) callback(err);else loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      }
      self._index = 0;
      loop();
      return promise;
    }
  }, {
    key: 'map',
    value: function map(fn, cb) {
      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      var self = this,
          result = [];

      function loop(x) {
        try {
          while (self._index < self._result.length) {
            result.push(fn(self._result[self._index], self._index, self));
            self._index++;
          }
          if (!self._hasMore) callback(null, result);else {
            self._more(function (err) {
              if (err) callback(err);else loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      }
      self._index = 0;
      loop();
      return promise;
    }
  }, {
    key: 'reduce',
    value: function reduce(fn, accu, cb) {
      if (typeof accu === 'function') {
        cb = accu;
        accu = undefined;
      }

      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      var self = this;
      function loop() {
        try {
          while (self._index < self._result.length) {
            accu = fn(accu, self._result[self._index], self._index, self);
            self._index++;
          }
          if (!self._hasMore) callback(null, accu);else {
            self._more(function (err) {
              if (err) callback(err);else loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      }
      if (accu !== undefined) {
        self._index = 0;
        loop();
      } else if (self._result.length > 1) {
        accu = self._result[0];
        self._index = 1;
        loop();
      } else {
        self._more(function (err) {
          if (err) callback(err);else {
            accu = self._result[0];
            self._index = 1;
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