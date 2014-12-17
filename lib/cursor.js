/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  ArangoError = require('./error'),
  all = require('./util/all');

module.exports = ArrayCursor;

function ArrayCursor(connection, body) {
  this.extra = body.extra;
  this._connection = connection;
  this._result = body.result;
  this._hasMore = Boolean(body.hasMore);
  this._id = body.id;
  this._index = 0;
}

extend(ArrayCursor.prototype, {
  _drain: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._more(function (err) {
      if (err) callback(err);
      else if (!self._hasMore) callback(null, self);
      else self._drain(callback);
    });
  },
  _more: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    if (!self._hasMore) callback(null, self);
    else {
      self._connection.put('cursor/' + this._id, function (err, body) {
        if (err) callback(err);
        else {
          self._result.push.apply(self._result, body.result);
          self._hasMore = body.hasMore;
          callback(null, self);
        }
      });
    }
  },
  all: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._drain(function (err) {
      self._index = self._result.length;
      if (err) callback(err);
      else callback(null, self._result);
    });
  },
  next: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    function next() {
      var value = self._result[self._index];
      self._index += 1;
      callback(null, value);
    }
    if (self._index < self._result.length) next();
    else {
      if (!self._hasMore) callback(null);
      else {
        self._more(function (err) {
          if (err) callback(err);
          else next();
        });
      }
    }
  },
  hasNext: function () {
    return (this._hasMore || this._index < this._result.length);
  },
  each: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._drain(function (err) {
      if (err) callback(err);
      else {
        try {
          var result;
          for (self._index = 0; self._index < self._result.length; self._index++) {
            result = fn(self._result[self._index], self._index, self);
            if (result === false) break;
          }
          callback(null);
        }
        catch (e) {callback(e);}
      }
    });
  },
  every: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    function step(x) {
      try {
        var result = true;
        for (self._index = x; self._index < self._result.length; self._index++) {
          result = fn(self._result[self._index], self._index, self);
          if (!result) break;
        }
        if (!self._hasMore || !result) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(self._index);
          });
        }
      }
      catch(e) {callback(e);}
    }
    step(0);
  },
  some: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    function step(x) {
      try {
        var result = false;
        for (self._index = x; self._index < self._result.length; self._index++) {
          result = fn(self._result[self._index], self._index, self);
          if (result) break;
        }
        if (!self._hasMore || result) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(self._index);
          });
        }
      }
      catch(e) {callback(e);}
    }
    step(0);
  },
  map: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this,
      result = [];

    function step(x) {
      try {
        for (self._index = x; self._index < self._result.length; self._index++) {
          result.push(fn(self._result[self._index], self._index, self));
        }
        if (!self._hasMore) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(self._index);
          });
        }
      }
      catch(e) {callback(e);}
    }
    step(0);
  },
  reduce: function (fn, accu, callback) {
    if (typeof accu === 'function') {
      callback = accu;
      accu = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    function step(x) {
      try {
        for (self._index = x; self._index < self._result.length; self._index++) {
          accu = fn(accu, self._result[self._index], self._index, self);
        }
        if (!self._hasMore) callback(null, accu);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(self._index);
          });
        }
      }
      catch(e) {callback(e);}
    }
    if (accu !== undefined) step(0);
    else if (self._result.length > 1) {
      accu = self._result[0];
      step(1);
    }
    else {
      self._more(function (err) {
        if (err) callback(err);
        else {
          accu = self._result[0];
          step(1);
        }
      });
    }
  },
  rewind: function () {
    this._index = 0;
  }
});
