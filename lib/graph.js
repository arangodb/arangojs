'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _collection = require('./collection');

var VertexCollection = (function (_BaseCollection) {
  _inherits(VertexCollection, _BaseCollection);

  function VertexCollection(connection, name, graph) {
    _classCallCheck(this, VertexCollection);

    _get(Object.getPrototypeOf(VertexCollection.prototype), 'constructor', this).call(this, connection, name);
    this.graph = graph;
    this._gharial = this._api.route('gharial/' + this.graph.name + '/vertex/' + this.name);
  }

  _createClass(VertexCollection, [{
    key: 'vertex',
    value: function vertex(documentHandle, cb) {
      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      this._gharial.get(documentHandle, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'save',
    value: function save(data, cb) {
      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      this._gharial.post(data, {
        collection: this.name
      }, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }]);

  return VertexCollection;
})(_collection._BaseCollection);

var EdgeCollection = (function (_BaseCollection2) {
  _inherits(EdgeCollection, _BaseCollection2);

  function EdgeCollection(connection, name, graph) {
    _classCallCheck(this, EdgeCollection);

    _get(Object.getPrototypeOf(EdgeCollection.prototype), 'constructor', this).call(this, connection, name);
    this.graph = graph;
    this._gharial = this._api.route('gharial/' + this.graph.name + '/edge/' + this.name);
  }

  _createClass(EdgeCollection, [{
    key: 'edge',
    value: function edge(documentHandle, cb) {
      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      this._gharial.get(documentHandle, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'save',
    value: function save(data, fromId, toId, cb) {
      if (typeof fromId === 'function') {
        cb = fromId;
        fromId = undefined;
      } else {
        data._from = this._documentHandle(fromId);
        data._to = this._documentHandle(toId);
      }

      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      this._gharial.post(data, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }]);

  return EdgeCollection;
})(_collection._BaseCollection);

var Graph = (function () {
  _createClass(Graph, null, [{
    key: 'VertexCollection',
    value: VertexCollection,
    enumerable: true
  }, {
    key: 'EdgeCollection',
    value: EdgeCollection,
    enumerable: true
  }]);

  function Graph(connection, name) {
    _classCallCheck(this, Graph);

    this._connection = connection;
    this._api = this._connection.route('_api');
    this._gharial = this._api.route('gharial/' + this.name);
    this.name = name;
  }

  _createClass(Graph, [{
    key: 'get',
    value: function get(cb) {
      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      this._gharial.get(function (err, res) {
        if (err) callback(err);else callback(null, res.body.graph);
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

      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      var self = this;
      properties = (0, _extend2['default'])({}, properties, { name: this.name });
      self._api.post('gharial', properties, function (err, res) {
        if (err) callback(err);else callback(null, res.body.graph);
      });
      return promise;
    }
  }, {
    key: 'drop',
    value: function drop(dropCollections, cb) {
      if (typeof dropCollections === 'function') {
        cb = dropCollections;
        dropCollections = undefined;
      }

      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      this._gharial['delete']({
        dropCollections: dropCollections
      }, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'vertexCollection',
    value: function vertexCollection(collectionName, cb) {
      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      var self = this;
      self._api.get('collection/' + collectionName, function (err, res) {
        if (err) callback(err);else callback(null, new VertexCollection(self._connection, res.body, self));
      });
      return promise;
    }
  }, {
    key: 'addVertexCollection',
    value: function addVertexCollection(collectionName, cb) {
      var _connection$promisify9 = this._connection.promisify(cb);

      var promise = _connection$promisify9.promise;
      var callback = _connection$promisify9.callback;

      this._gharial.post('vertex', { collection: collectionName }, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'removeVertexCollection',
    value: function removeVertexCollection(collectionName, dropCollection, cb) {
      if (typeof dropCollection === 'function') {
        cb = dropCollection;
        dropCollection = undefined;
      }

      var _connection$promisify10 = this._connection.promisify(cb);

      var promise = _connection$promisify10.promise;
      var callback = _connection$promisify10.callback;

      this._gharial['delete']('vertex/' + collectionName, { dropCollection: dropCollection }, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'edgeCollection',
    value: function edgeCollection(collectionName, cb) {
      var _connection$promisify11 = this._connection.promisify(cb);

      var promise = _connection$promisify11.promise;
      var callback = _connection$promisify11.callback;

      var self = this;
      self._api.get('collection/' + collectionName, function (err, res) {
        if (err) callback(err);else callback(null, new EdgeCollection(self._connection, res.body, self));
      });
      return promise;
    }
  }, {
    key: 'addEdgeDefinition',
    value: function addEdgeDefinition(definition, cb) {
      var _connection$promisify12 = this._connection.promisify(cb);

      var promise = _connection$promisify12.promise;
      var callback = _connection$promisify12.callback;

      this._gharial.post('edge', definition, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'replaceEdgeDefinition',
    value: function replaceEdgeDefinition(definitionName, definition, cb) {
      var _connection$promisify13 = this._connection.promisify(cb);

      var promise = _connection$promisify13.promise;
      var callback = _connection$promisify13.callback;

      this._api.put('gharial/' + this.name + '/edge/' + definitionName, definition, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'removeEdgeDefinition',
    value: function removeEdgeDefinition(definitionName, dropCollection, cb) {
      if (typeof dropCollection === 'function') {
        cb = dropCollection;
        dropCollection = undefined;
      }

      var _connection$promisify14 = this._connection.promisify(cb);

      var promise = _connection$promisify14.promise;
      var callback = _connection$promisify14.callback;

      this._gharial['delete']('edge/' + definitionName, { dropCollection: dropCollection }, function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'traversal',
    value: function traversal(startVertex, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify15 = this._connection.promisify(cb);

      var promise = _connection$promisify15.promise;
      var callback = _connection$promisify15.callback;

      this._api.post('traversal', (0, _extend2['default'])({}, opts, {
        startVertex: startVertex,
        graphName: this.name
      }), function (err, res) {
        if (err) callback(err);else callback(null, res.body.result);
      });
      return promise;
    }
  }]);

  return Graph;
})();

exports['default'] = Graph;
module.exports = exports['default'];