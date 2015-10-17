'use strict';
export default class ArrayCursor {
  constructor(connection, body) {
    this.extra = body.extra;
    this._connection = connection;
    this._api = this._connection.route('_api');
    this._result = body.result;
    this._hasMore = Boolean(body.hasMore);
    this._id = body.id;
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
      if (err) callback(err);
      else callback(null, this._result);
    });
    return promise;
  }

  next(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    const next = () => {
      const value = this._result.shift();
      callback(null, value);
    };
    if (this._result[0]) next();
    else {
      if (!this._hasMore) callback(null);
      else {
        this._more(err => err ? callback(err) : next());
      }
    }
    return promise;
  }

  hasNext() {
    return (this._hasMore || this._result.length[0]);
  }

  each(fn, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    const loop = () => {
      try {
        let result;
        while (this._result[0]) {
          result = fn(this._result.shift(), this);
          if (result === false) break;
        }
        if (!this._hasMore || result === false) callback(null, result);
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch (e) {
        callback(e);
      }
    };
    loop();
    return promise;
  }

  every(fn, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    const loop = () => {
      try {
        let result = true;
        while (this._result[0]) {
          result = fn(this._result.shift(), this);
          if (!result) break;
        }
        if (!this._hasMore || !result) callback(null, Boolean(result));
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch (e) {
        callback(e);
      }
    };
    loop();
    return promise;
  }

  some(fn, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    const loop = () => {
      try {
        let result = false;
        while (this._result[0]) {
          result = fn(this._result.shift(), this);
          if (result) break;
        }
        if (!this._hasMore || result) callback(null, Boolean(result));
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch (e) {
        callback(e);
      }
    };
    loop();
    return promise;
  }

  map(fn, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    const result = [];
    const loop = () => {
      try {
        while (this._result[0]) {
          result.push(fn(this._result.shift(), this));
        }
        if (!this._hasMore) callback(null, result);
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch (e) {
        callback(e);
      }
    };
    loop();
    return promise;
  }

  reduce(fn, accu, cb) {
    if (typeof accu === 'function') {
      cb = accu;
      accu = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    const loop = () => {
      try {
        while (this._result[0]) {
          accu = fn(accu, this._result.shift(), this);
        }
        if (!this._hasMore) callback(null, accu);
        else {
          this._more(err => err ? callback(err) : loop());
        }
      } catch (e) {
        callback(e);
      }
    };
    if (accu !== undefined) {
      loop();
    } else if (this._result.length > 1) {
      accu = this._result.shift();
      loop();
    } else {
      this._more(err => {
        if (err) callback(err);
        else {
          accu = this._result.shift();
          loop();
        }
      });
    }
    return promise;
  }

  rewind() {
    //this._index = 0;
    return this;
  }
}
