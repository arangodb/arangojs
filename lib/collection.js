'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get2 = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports['default'] = construct;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _cursor = require('./cursor');

var _cursor2 = _interopRequireDefault(_cursor);

var types = {
  DOCUMENT_COLLECTION: 2,
  EDGE_COLLECTION: 3
};

exports.types = types;

var BaseCollection = (function () {
  function BaseCollection(connection, name) {
    _classCallCheck(this, BaseCollection);

    this._connection = connection;
    this._api = this._connection.route('_api');
    this.name = name;
  }

  _createClass(BaseCollection, [{
    key: '_documentHandle',
    value: function _documentHandle(documentHandle) {
      if (documentHandle._id) {
        documentHandle = documentHandle._id;
      } else if (documentHandle._key) {
        documentHandle = documentHandle._key;
      }
      if (documentHandle.indexOf('/') === -1) {
        documentHandle = this.name + '/' + documentHandle;
      }
      return documentHandle;
    }
  }, {
    key: '_indexHandle',
    value: function _indexHandle(indexHandle) {
      if (indexHandle.id) {
        indexHandle = indexHandle.id;
      }
      if (indexHandle.indexOf('/') === -1) {
        indexHandle = this.name + '/' + indexHandle;
      }
      return indexHandle;
    }
  }, {
    key: '_get',
    value: function _get(path, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      this._api.get('collection/' + this.name + '/' + path, opts, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: '_put',
    value: function _put(path, data, cb) {
      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      this._api.put('collection/' + this.name + '/' + path, data, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'get',
    value: function get(cb) {
      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      this._api.get('collection/' + this.name, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'create',
    value: function create(properties, cb) {
      if (typeof properties === 'function') {
        cb = properties;
        properties = undefined;
      }

      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      this._api.post('collection', (0, _extend2['default'])({}, properties, { name: this.name, type: this.type }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'properties',
    value: function properties(cb) {
      return this._get('properties', cb);
    }
  }, {
    key: 'count',
    value: function count(cb) {
      return this._get('count', cb);
    }
  }, {
    key: 'figures',
    value: function figures(cb) {
      return this._get('figures', cb);
    }
  }, {
    key: 'revision',
    value: function revision(cb) {
      return this._get('revision', cb);
    }
  }, {
    key: 'checksum',
    value: function checksum(opts, cb) {
      return this._get('checksum', opts, cb);
    }
  }, {
    key: 'load',
    value: function load(count, cb) {
      if (typeof count === 'function') {
        cb = count;
        count = undefined;
      }
      return this._put('load', typeof count === 'boolean' ? { count: count } : undefined, cb);
    }
  }, {
    key: 'unload',
    value: function unload(cb) {
      return this._put('unload', undefined, cb);
    }
  }, {
    key: 'setProperties',
    value: function setProperties(properties, cb) {
      return this._put('properties', properties, cb);
    }
  }, {
    key: 'rename',
    value: function rename(name, cb) {
      var _this = this;

      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      this._api.put('collection/' + this.name + '/rename', { name: name }, function (err, res) {
        if (err) callback(err);else {
          _this.name = name;
          callback(null, res.body);
        }
      });
      return promise;
    }
  }, {
    key: 'rotate',
    value: function rotate(cb) {
      return this._put('rotate', undefined, cb);
    }
  }, {
    key: 'truncate',
    value: function truncate(cb) {
      return this._put('truncate', undefined, cb);
    }
  }, {
    key: 'drop',
    value: function drop(cb) {
      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      this._api['delete']('collection/' + this.name, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'replace',
    value: function replace(documentHandle, data, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      this._api.put(this._documentPath(documentHandle), data, (0, _extend2['default'])({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'update',
    value: function update(documentHandle, data, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      this._api.patch(this._documentPath(documentHandle), data, (0, _extend2['default'])({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'remove',
    value: function remove(documentHandle, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify9 = this._connection.promisify(cb);

      var promise = _connection$promisify9.promise;
      var callback = _connection$promisify9.callback;

      this._api['delete'](this._documentPath(documentHandle), (0, _extend2['default'])({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'list',
    value: function list(type, cb) {
      if (typeof type === 'function') {
        cb = type;
        type = undefined;
      }
      if (!type) type = 'id';

      var _connection$promisify10 = this._connection.promisify(cb);

      var promise = _connection$promisify10.promise;
      var callback = _connection$promisify10.callback;

      this._api.get('document', { type: type, collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.documents);
      });
      return promise;
    }
  }, {
    key: 'all',
    value: function all(opts, cb) {
      var _this2 = this;

      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify11 = this._connection.promisify(cb);

      var promise = _connection$promisify11.promise;
      var callback = _connection$promisify11.callback;

      this._api.put('simple/all', (0, _extend2['default'])({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, new _cursor2['default'](_this2._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'byExample',
    value: function byExample(example, opts, cb) {
      var _this3 = this;

      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify12 = this._connection.promisify(cb);

      var promise = _connection$promisify12.promise;
      var callback = _connection$promisify12.callback;

      this._api.put('simple/by-example', (0, _extend2['default'])({}, opts, { example: example, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, new _cursor2['default'](_this3._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'firstExample',
    value: function firstExample(example, cb) {
      var _connection$promisify13 = this._connection.promisify(cb);

      var promise = _connection$promisify13.promise;
      var callback = _connection$promisify13.callback;

      this._api.put('simple/first-example', { example: example, collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.document);
      });
      return promise;
    }
  }, {
    key: 'any',
    value: function any(cb) {
      var _connection$promisify14 = this._connection.promisify(cb);

      var promise = _connection$promisify14.promise;
      var callback = _connection$promisify14.callback;

      this._api.put('simple/any', { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.document);
      });
      return promise;
    }
  }, {
    key: 'lookupByKeys',
    value: function lookupByKeys(keys, cb) {
      var _connection$promisify15 = this._connection.promisify(cb);

      var promise = _connection$promisify15.promise;
      var callback = _connection$promisify15.callback;

      this._api.put('simple/lookup-by-keys', { keys: keys, collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.documents);
      });
      return promise;
    }
  }, {
    key: 'removeByKeys',
    value: function removeByKeys(keys, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify16 = this._connection.promisify(cb);

      var promise = _connection$promisify16.promise;
      var callback = _connection$promisify16.callback;

      this._api.put('simple/remove-by-keys', (0, _extend2['default'])({}, opts, { keys: keys, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'removeByExample',
    value: function removeByExample(example, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify17 = this._connection.promisify(cb);

      var promise = _connection$promisify17.promise;
      var callback = _connection$promisify17.callback;

      this._api.put('simple/remove-by-example', (0, _extend2['default'])({}, opts, { example: example, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'replaceByExample',
    value: function replaceByExample(example, newValue, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify18 = this._connection.promisify(cb);

      var promise = _connection$promisify18.promise;
      var callback = _connection$promisify18.callback;

      this._api.put('simple/replace-by-example', (0, _extend2['default'])({}, opts, { example: example, newValue: newValue, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'updateByExample',
    value: function updateByExample(example, newValue, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify19 = this._connection.promisify(cb);

      var promise = _connection$promisify19.promise;
      var callback = _connection$promisify19.callback;

      this._api.put('simple/update-by-example', (0, _extend2['default'])({}, opts, { example: example, newValue: newValue, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'first',
    value: function first(opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof opts === 'number') {
        opts = { count: opts };
      }

      var _connection$promisify20 = this._connection.promisify(cb);

      var promise = _connection$promisify20.promise;
      var callback = _connection$promisify20.callback;

      this._api.put('simple/first', (0, _extend2['default'])({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.result);
      });
      return promise;
    }
  }, {
    key: 'last',
    value: function last(opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof opts === 'number') {
        opts = { count: opts };
      }

      var _connection$promisify21 = this._connection.promisify(cb);

      var promise = _connection$promisify21.promise;
      var callback = _connection$promisify21.callback;

      this._api.put('simple/last', (0, _extend2['default'])({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.result);
      });
      return promise;
    }
  }, {
    key: 'import',
    value: function _import(data, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify22 = this._connection.promisify(cb);

      var promise = _connection$promisify22.promise;
      var callback = _connection$promisify22.callback;

      this._api.request({
        method: 'POST',
        path: 'import',
        body: data,
        ld: Boolean(!opts || opts.type !== 'array'),
        qs: (0, _extend2['default'])({ type: 'auto' }, opts, { collection: this.name })
      }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'indexes',
    value: function indexes(cb) {
      var _connection$promisify23 = this._connection.promisify(cb);

      var promise = _connection$promisify23.promise;
      var callback = _connection$promisify23.callback;

      this._api.get('index', { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.indexes);
      });
      return promise;
    }
  }, {
    key: 'index',
    value: function index(indexHandle, cb) {
      var _connection$promisify24 = this._connection.promisify(cb);

      var promise = _connection$promisify24.promise;
      var callback = _connection$promisify24.callback;

      this._api.get('index/' + this._indexHandle(indexHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createIndex',
    value: function createIndex(details, cb) {
      var _connection$promisify25 = this._connection.promisify(cb);

      var promise = _connection$promisify25.promise;
      var callback = _connection$promisify25.callback;

      this._api.post('index', details, { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'dropIndex',
    value: function dropIndex(indexHandle, cb) {
      var _connection$promisify26 = this._connection.promisify(cb);

      var promise = _connection$promisify26.promise;
      var callback = _connection$promisify26.callback;

      this._api['delete']('index/' + this._indexHandle(indexHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createCapConstraint',
    value: function createCapConstraint(size, cb) {
      if (typeof size === 'number') {
        size = { size: size };
      }

      var _connection$promisify27 = this._connection.promisify(cb);

      var promise = _connection$promisify27.promise;
      var callback = _connection$promisify27.callback;

      this._api.post('index', (0, _extend2['default'])({}, size, { type: 'cap' }), { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createHashIndex',
    value: function createHashIndex(fields, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof fields === 'string') {
        fields = [fields];
      }
      if (typeof opts === 'boolean') {
        opts = { unique: opts };
      }

      var _connection$promisify28 = this._connection.promisify(cb);

      var promise = _connection$promisify28.promise;
      var callback = _connection$promisify28.callback;

      this._api.post('index', (0, _extend2['default'])({ unique: false }, opts, { type: 'hash', fields: fields }), { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createSkipList',
    value: function createSkipList(fields, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof fields === 'string') {
        fields = [fields];
      }
      if (typeof opts === 'boolean') {
        opts = { unique: opts };
      }

      var _connection$promisify29 = this._connection.promisify(cb);

      var promise = _connection$promisify29.promise;
      var callback = _connection$promisify29.callback;

      this._api.post('index', (0, _extend2['default'])({ unique: false }, opts, { type: 'skiplist', fields: fields }), { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createGeoIndex',
    value: function createGeoIndex(fields, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof fields === 'string') {
        fields = [fields];
      }

      var _connection$promisify30 = this._connection.promisify(cb);

      var promise = _connection$promisify30.promise;
      var callback = _connection$promisify30.callback;

      this._api.post('index', (0, _extend2['default'])({}, opts, { fields: fields, type: 'geo' }), { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createFulltextIndex',
    value: function createFulltextIndex(fields, minLength, cb) {
      if (typeof minLength === 'function') {
        cb = minLength;
        minLength = undefined;
      }
      if (typeof fields === 'string') {
        fields = [fields];
      }
      if (minLength) minLength = Number(minLength);

      var _connection$promisify31 = this._connection.promisify(cb);

      var promise = _connection$promisify31.promise;
      var callback = _connection$promisify31.callback;

      this._api.post('index', { fields: fields, minLength: minLength, type: 'fulltext' }, { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'fulltext',
    value: function fulltext(attribute, query, opts, cb) {
      var _this4 = this;

      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (!opts) opts = {};
      if (opts.index) opts.index = this._indexHandle(opts.index);

      var _connection$promisify32 = this._connection.promisify(cb);

      var promise = _connection$promisify32.promise;
      var callback = _connection$promisify32.callback;

      this._api.put('simple/fulltext', (0, _extend2['default'])({}, opts, { attribute: attribute, query: query, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, new _cursor2['default'](_this4._connection, res.body));
      });
      return promise;
    }
  }]);

  return BaseCollection;
})();

var DocumentCollection = (function (_BaseCollection) {
  _inherits(DocumentCollection, _BaseCollection);

  function DocumentCollection() {
    _classCallCheck(this, DocumentCollection);

    _get2(Object.getPrototypeOf(DocumentCollection.prototype), 'constructor', this).apply(this, arguments);

    this.type = types.DOCUMENT_COLLECTION;
  }

  _createClass(DocumentCollection, [{
    key: '_documentPath',
    value: function _documentPath(documentHandle) {
      return 'document/' + this._documentHandle(documentHandle);
    }
  }, {
    key: 'document',
    value: function document(documentHandle, cb) {
      var _connection$promisify33 = this._connection.promisify(cb);

      var promise = _connection$promisify33.promise;
      var callback = _connection$promisify33.callback;

      this._api.get('document/' + this._documentHandle(documentHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'save',
    value: function save(data, cb) {
      var _connection$promisify34 = this._connection.promisify(cb);

      var promise = _connection$promisify34.promise;
      var callback = _connection$promisify34.callback;

      this._api.post('document', data, { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }]);

  return DocumentCollection;
})(BaseCollection);

var EdgeCollection = (function (_BaseCollection2) {
  _inherits(EdgeCollection, _BaseCollection2);

  function EdgeCollection() {
    _classCallCheck(this, EdgeCollection);

    _get2(Object.getPrototypeOf(EdgeCollection.prototype), 'constructor', this).apply(this, arguments);

    this.type = types.EDGE_COLLECTION;
  }

  _createClass(EdgeCollection, [{
    key: '_documentPath',
    value: function _documentPath(documentHandle) {
      return 'edge/' + this._documentHandle(documentHandle);
    }
  }, {
    key: 'edge',
    value: function edge(documentHandle, cb) {
      var _connection$promisify35 = this._connection.promisify(cb);

      var promise = _connection$promisify35.promise;
      var callback = _connection$promisify35.callback;

      this._api.get('edge/' + this._documentHandle(documentHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'save',
    value: function save(data, fromId, toId, cb) {
      var _connection$promisify36 = this._connection.promisify(cb);

      var promise = _connection$promisify36.promise;
      var callback = _connection$promisify36.callback;

      this._api.post('edge', data, {
        collection: this.name,
        from: this._documentHandle(fromId),
        to: this._documentHandle(toId)
      }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: '_edges',
    value: function _edges(documentHandle, direction, cb) {
      var _connection$promisify37 = this._connection.promisify(cb);

      var promise = _connection$promisify37.promise;
      var callback = _connection$promisify37.callback;

      this._api.get('edges/' + this.name, { direction: direction, vertex: this._documentHandle(documentHandle) }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.edges);
      });
      return promise;
    }
  }, {
    key: 'edges',
    value: function edges(vertex, cb) {
      return this._edges(vertex, undefined, cb);
    }
  }, {
    key: 'inEdges',
    value: function inEdges(vertex, cb) {
      return this._edges(vertex, 'in', cb);
    }
  }, {
    key: 'outEdges',
    value: function outEdges(vertex, cb) {
      return this._edges(vertex, 'out', cb);
    }
  }, {
    key: 'traversal',
    value: function traversal(startVertex, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify38 = this._connection.promisify(cb);

      var promise = _connection$promisify38.promise;
      var callback = _connection$promisify38.callback;

      this._api.post('traversal', (0, _extend2['default'])({}, opts, { startVertex: startVertex, edgeCollection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }]);

  return EdgeCollection;
})(BaseCollection);

function construct(connection, body) {
  var Collection = body.type === types.EDGE_COLLECTION ? EdgeCollection : DocumentCollection;
  return new Collection(connection, body.name);
}

exports.EdgeCollection = EdgeCollection;
exports.DocumentCollection = DocumentCollection;
exports._BaseCollection = BaseCollection;