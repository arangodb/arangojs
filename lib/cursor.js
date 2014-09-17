/*jshint browserify: true */
"use strict";

var extend = require('extend'),
  ArangoError = require('./error'),
  promisify = require('./util/promisify');

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
    var self = this;
    self._more(function (err) {
      if (err) callback(err);
      else if (!self._hasMore) callback(null, self);
      else self._drain(callback);
    });
  },
  _more: function (callback) {
    var self = this;
    if (!self._hasMore) callback(null, self);
    else {
      self._connection.put('cursor/' + this._id, '', function (err, body) {
        if (err) callback(err);
        else if (body.error) callback(new ArangoError(body));
        else {
          self._result.push.apply(self._result, body.result);
          self._hasMore = body.hasMore;
          console.log(self._result.length, self._hasMore);
          callback(null, self);
        }
      });
    }
  },
  all: function (callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._drain(function (err) {
        if (err) reject(err);
        else resolve(self._result);
      });
    });
  },
  next: function (callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      function next() {
        var value = self._result[self._current];
        self._current += 1;
        resolve(value);
      }
      if (self._current < self._result.length) next();
      else {
        if (!self._hasMore) resolve();
        else {
          self._more(function (err) {
            if (err) reject(err);
            else next();
          });
        }
      }
    });
  },
  hasNext: function () {
    return (this._hasMore || this._current < this._result.length);
  },
  each: function (fn, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._drain(function (err) {
        if (err) reject(err);
        else {
          try {
            var i, result;
            for (i = 0; i < self._result.length; i++) {
              result = fn(self._result[i], i, self);
              if (result === false) break;
            }
            resolve(self);
          }
          catch (e) {reject(e);}
        }
      });
    });
  },
  every: function (fn, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      function step(x) {
        try {
          var i, result = true;
          for (i = x; i < self._result.length; i++) {
            result = fn(self._result[i], i, self);
            if (!result) break;
          }
          if (!self._hasMore || !result) resolve(result);
          else {
            self._more(function (err) {
              if (err) reject(err);
              else step(i);
            });
          }
        }
        catch(e) {reject(e);}
      }
      step(0);
    });
  },
  some: function (fn, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      function step(x) {
        try {
          var i, result = false;
          for (i = x; i < self._result.length; i++) {
            result = fn(self._result[i], i, self);
            if (result) break;
          }
          if (!self._hasMore || result) resolve(result);
          else {
            self._more(function (err) {
              if (err) reject(err);
              else step(i);
            });
          }
        }
        catch(e) {reject(e);}
      }
      step(0);
    });
  },
  map: function (fn, callback) {
    var self = this,
      result = [];
    return promisify(callback, function (resolve, reject) {
      function step(x) {
        try {
          var i;
          for (i = x; i < self._result.length; i++) {
            result.push(fn(self._result[i], i, self));
          }
          if (!self._hasMore) resolve(result);
          else {
            self._more(function (err) {
              if (err) reject(err);
              else step(i);
            });
          }
        }
        catch(e) {reject(e);}
      }
      step(0);
    });
  },
  reduce: function (fn, accu, callback) {
    if (typeof accu === 'function') {
      callback = accu;
      accu = undefined;
    }
    var self = this;
    return promisify(callback, function (resolve, reject) {
      function step(x) {
        try {
          var i;
          for (i = x; i < self._result.length; i++) {
            accu = fn(accu, self._result[i], i, self);
          }
          if (!self._hasMore) resolve(accu);
          else {
            self._more(function (err) {
              if (err) reject(err);
              else step(i);
            });
          }
        }
        catch(e) {reject(e);}
      }
      if (accu !== undefined) step(0);
      else if (self._result.length > 1) {
        accu = self._result[0];
        step(1);
      }
      else {
        self._more(function (err) {
          if (err) reject(err);
          else {
            accu = self._result[0];
            step(1);
          }
        });
      }
    });
  }
});
