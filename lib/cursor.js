/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  ArangoError = require('./error'),
  all = require('./util/all');

module.exports = ArrayCursor;

function ArrayCursor(connection, body) {
  this._connection = connection;
  this._result = body.result;
  this._hasMore = Boolean(body.hasMore);
  this._id = body.id;
  this._current = 0;
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
        else if (body.error) callback(new ArangoError(body));
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
      if (err) callback(err);
      else callback(null, self._result);
    });
  },
  next: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    function next() {
      var value = self._result[self._current];
      self._current += 1;
      callback(null, value);
    }
    if (self._current < self._result.length) next();
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
    return (this._hasMore || this._current < this._result.length);
  },
  each: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._drain(function (err) {
      if (err) callback(err);
      else {
        try {
          var i, result;
          for (i = 0; i < self._result.length; i++) {
            result = fn(self._result[i], i, self);
            if (result === false) break;
          }
          callback(null, self);
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
        var i, result = true;
        for (i = x; i < self._result.length; i++) {
          result = fn(self._result[i], i, self);
          if (!result) break;
        }
        if (!self._hasMore || !result) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(i);
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
        var i, result = false;
        for (i = x; i < self._result.length; i++) {
          result = fn(self._result[i], i, self);
          if (result) break;
        }
        if (!self._hasMore || result) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(i);
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
        var i;
        for (i = x; i < self._result.length; i++) {
          result.push(fn(self._result[i], i, self));
        }
        if (!self._hasMore) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(i);
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
        var i;
        for (i = x; i < self._result.length; i++) {
          accu = fn(accu, self._result[i], i, self);
        }
        if (!self._hasMore) callback(null, accu);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(i);
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
  }
});
