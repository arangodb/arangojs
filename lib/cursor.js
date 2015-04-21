'use strict';
var promisify = require('./util/promisify');
var extend = require('extend');

module.exports = ArrayCursor;

function ArrayCursor(connection, body) {
  this.extra = body.extra;
  this._connection = connection;
  this._api = this._connection.route('_api');
  this._result = body.result;
  this._hasMore = Boolean(body.hasMore);
  this._id = body.id;
  this._index = 0;
}

extend(ArrayCursor.prototype, {
  _drain: function _drain(cb) {
    var _promisify = promisify(cb);

    var promise = _promisify.promise;
    var callback = _promisify.callback;

    var self = this;
    self._more(function (err) {
      if (err) callback(err);else if (!self._hasMore) callback(null, self);else self._drain(cb);
    });
    return promise;
  },
  _more: function _more(callback) {
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
  },
  all: function all(cb) {
    var _promisify2 = promisify(cb);

    var promise = _promisify2.promise;
    var callback = _promisify2.callback;

    var self = this;
    self._drain(function (err) {
      self._index = self._result.length;
      if (err) callback(err);else callback(null, self._result);
    });
    return promise;
  },
  next: function next(cb) {
    var _promisify3 = promisify(cb);

    var promise = _promisify3.promise;
    var callback = _promisify3.callback;

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
  },
  hasNext: function hasNext() {
    return this._hasMore || this._index < this._result.length;
  },
  each: function each(fn, cb) {
    var _promisify4 = promisify(cb);

    var promise = _promisify4.promise;
    var callback = _promisify4.callback;

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
  },
  every: function every(fn, cb) {
    var _promisify5 = promisify(cb);

    var promise = _promisify5.promise;
    var callback = _promisify5.callback;

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
  },
  some: function some(fn, cb) {
    var _promisify6 = promisify(cb);

    var promise = _promisify6.promise;
    var callback = _promisify6.callback;

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
  },
  map: function map(fn, cb) {
    var _promisify7 = promisify(cb);

    var promise = _promisify7.promise;
    var callback = _promisify7.callback;

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
  },
  reduce: function reduce(fn, accu, cb) {
    if (typeof accu === 'function') {
      cb = accu;
      accu = undefined;
    }

    var _promisify8 = promisify(cb);

    var promise = _promisify8.promise;
    var callback = _promisify8.callback;

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
  },
  rewind: function rewind() {
    this._index = 0;
    return this;
  }
});