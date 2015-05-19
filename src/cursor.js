'use strict';
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
  _drain(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._more(function (err) {
      if (err) callback(err);
      else if (!self._hasMore) callback(null, self);
      else self._drain(cb);
    });
    return promise;
  },
  _more(callback) {
    var self = this;
    if (!self._hasMore) callback(null, self);
    else {
      self._api.put('cursor/' + this._id, function (err, res) {
        if (err) callback(err);
        else {
          self._result.push.apply(self._result, res.body.result);
          self._hasMore = res.body.hasMore;
          callback(null, self);
        }
      });
    }
  },
  all(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._drain(function (err) {
      self._index = self._result.length;
      if (err) callback(err);
      else callback(null, self._result);
    });
    return promise;
  },
  next(cb) {
    var {promise, callback} = this._connection.promisify(cb);
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
    return promise;
  },
  hasNext() {
    return (this._hasMore || this._index < this._result.length);
  },
  each(fn, cb) {
    var {promise, callback} = this._connection.promisify(cb);
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
        } catch (e) {
          callback(e);
        }
      }
    });
    return promise;
  },
  every(fn, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    function loop() {
      try {
        var result = true;
        while (self._index < self._result.length) {
          result = fn(self._result[self._index], self._index, self);
          self._index++;
          if (!result) break;
        }
        if (!self._hasMore || !result) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else loop();
          });
        }
      } catch(e) {
        callback(e);
      }
    }
    self._index = 0;
    loop();
    return promise;
  },
  some(fn, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    function loop() {
      try {
        var result = false;
        while (self._index < self._result.length) {
          result = fn(self._result[self._index], self._index, self);
          self._index++;
          if (result) break;
        }
        if (!self._hasMore || result) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else loop();
          });
        }
      } catch(e) {
        callback(e);
      }
    }
    self._index = 0;
    loop();
    return promise;
  },
  map(fn, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this,
      result = [];

    function loop(x) {
      try {
        while (self._index < self._result.length) {
          result.push(fn(self._result[self._index], self._index, self));
          self._index++;
        }
        if (!self._hasMore) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else loop();
          });
        }
      } catch(e) {
        callback(e);
      }
    }
    self._index = 0;
    loop();
    return promise;
  },
  reduce(fn, accu, cb) {
    if (typeof accu === 'function') {
      cb = accu;
      accu = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    function loop() {
      try {
        while (self._index < self._result.length) {
          accu = fn(accu, self._result[self._index], self._index, self);
          self._index++;
        }
        if (!self._hasMore) callback(null, accu);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else loop();
          });
        }
      } catch(e) {
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
        if (err) callback(err);
        else {
          accu = self._result[0];
          self._index = 1;
          loop();
        }
      });
    }
    return promise;
  },
  rewind() {
    this._index = 0;
    return this;
  }
});
