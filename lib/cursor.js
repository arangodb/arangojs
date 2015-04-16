'use strict';
var noop = require('./util/noop');
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
  _drain: function _drain(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._more(function (err) {
      if (err) callback(err);else if (!self._hasMore) callback(null, self);else self._drain(callback);
    });
  },
  _more: function _more(callback) {
    if (!callback) callback = noop;
    var self = this;
    if (!self._hasMore) callback(null, self);else {
      self._api.put('cursor/' + this._id, function (err, body) {
        if (err) callback(err);else {
          self._result.push.apply(self._result, body.result);
          self._hasMore = body.hasMore;
          callback(null, self);
        }
      });
    }
  },
  all: function all(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._drain(function (err) {
      self._index = self._result.length;
      if (err) callback(err);else callback(null, self._result);
    });
  },
  next: function next(callback) {
    if (!callback) callback = noop;
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
  },
  hasNext: function hasNext() {
    return this._hasMore || this._index < this._result.length;
  },
  each: function each(fn, callback) {
    if (!callback) callback = noop;
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
  },
  every: function every(fn, callback) {
    if (!callback) callback = noop;
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
  },
  some: function some(fn, callback) {
    if (!callback) callback = noop;
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
  },
  map: function map(fn, callback) {
    if (!callback) callback = noop;
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
  },
  reduce: function reduce(fn, accu, callback) {
    if (typeof accu === 'function') {
      callback = accu;
      accu = undefined;
    }
    if (!callback) callback = noop;
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
  },
  rewind: function rewind() {
    this._index = 0;
  }
});