'use strict';
export default class ArrayCursor {
  constructor(connection, body) {
    this.extra = body.extra;
    this._connection = connection;
    this._api = this._connection.route('_api');
    this._result = body.result;
    this._hasMore = Boolean(body.hasMore);
    this._id = body.id;
    this._index = 0;
    this.count = body.count;
  }

  _drain(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._more(err => (
      err ? callback(err) : (
        !this._hasMore
        ? callback(null, this)
        : this._drain(cb)
      )
    ));
    return promise;
  }

  _more(callback) {
    if (!this._hasMore) callback(null, this);
    else {
      this._api.put(`cursor/${this._id}`, (err, res) => {
        if (err) callback(err);
        else {
          this._result.push.apply(this._result, res.body.result);
          this._hasMore = res.body.hasMore;
          callback(null, this);
        }
      });
    }
  }

  all(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._drain(err => {
      this._index = this._result.length;
      if (err) callback(err);
      else callback(null, this._result);
    });
    return promise;
  }

  next(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    function next() {
      const value = this._result[this._index];
      this._index += 1;
      callback(null, value);
    }
    if (this._index < this._result.length) next();
    else {
      if (!this._hasMore) callback(null);
      else {
        this._more(err => err ? callback(err) : next());
      }
    }
    return promise;
  }

  hasNext() {
    return (this._hasMore || this._index < this._result.length);
  }

  each(fn, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    function loop() {
      try {
        let result;
        while (this._index < this._result.length) {
          result = fn(this._result[this._index], this._index, this);
          this._index++;
          if (result === false) break;
        }
        if (!this._hasMore || result === false) callback(null, result);
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch(e) {
        callback(e);
      }
    }
    this._index = 0;
    loop();
    return promise;
  }

  every(fn, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    function loop() {
      try {
        let result = true;
        while (this._index < this._result.length) {
          result = fn(this._result[this._index], this._index, this);
          this._index++;
          if (!result) break;
        }
        if (!this._hasMore || !result) callback(null, Boolean(result));
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch(e) {
        callback(e);
      }
    }
    this._index = 0;
    loop();
    return promise;
  }

  some(fn, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    function loop() {
      try {
        let result = false;
        while (this._index < this._result.length) {
          result = fn(this._result[this._index], this._index, this);
          this._index++;
          if (result) break;
        }
        if (!this._hasMore || result) callback(null, Boolean(result));
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch(e) {
        callback(e);
      }
    }
    this._index = 0;
    loop();
    return promise;
  }

  map(fn, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    const result = [];
    function loop(x) {
      try {
        while (this._index < this._result.length) {
          result.push(fn(this._result[this._index], this._index, this));
          this._index++;
        }
        if (!this._hasMore) callback(null, result);
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch(e) {
        callback(e);
      }
    }
    this._index = 0;
    loop();
    return promise;
  }

  reduce(fn, accu, cb) {
    if (typeof accu === 'function') {
      cb = accu;
      accu = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    function loop() {
      try {
        while (this._index < this._result.length) {
          accu = fn(accu, this._result[this._index], this._index, this);
          this._index++;
        }
        if (!this._hasMore) callback(null, accu);
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch(e) {
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
      this._more(err => {
        if (err) callback(err);
        else {
          accu = this._result[0];
          this._index = 1;
          loop();
        }
      });
    }
    return promise;
  }

  rewind() {
    this._index = 0;
    return this;
  }
}
