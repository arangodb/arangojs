import ArrayCursor from './cursor';

export const types = {
  DOCUMENT_COLLECTION: 2,
  EDGE_COLLECTION: 3
};

class BaseCollection {
  constructor(connection, name) {
    this.name = name;
    this._connection = connection;
    this._api = this._connection.route('_api');
  }

  _documentHandle(documentHandle) {
    if (documentHandle._id) {
      documentHandle = documentHandle._id;
    } else if (documentHandle._key) {
      documentHandle = documentHandle._key;
    }
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = `${this.name}/${documentHandle}`;
    }
    return documentHandle;
  }

  _indexHandle(indexHandle) {
    if (indexHandle.id) {
      indexHandle = indexHandle.id;
    }
    if (indexHandle.indexOf('/') === -1) {
      indexHandle = `${this.name}/${indexHandle}`;
    }
    return indexHandle;
  }

  _get(path, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      `collection/${this.name}/${path}`,
      opts,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  _put(path, data, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      `collection/${this.name}/${path}`,
      data,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  get(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      `collection/${this.name}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  create(properties, cb) {
    if (typeof properties === 'function') {
      cb = properties;
      properties = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'collection',
      {...properties, name: this.name, type: this.type},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  properties(cb) {
    return this._get('properties', cb);
  }

  count(cb) {
    return this._get('count', cb);
  }

  figures(cb) {
    return this._get('figures', cb);
  }

  revision(cb) {
    return this._get('revision', cb);
  }

  checksum(opts, cb) {
    return this._get('checksum', opts, cb);
  }

  load(count, cb) {
    if (typeof count === 'function') {
      cb = count;
      count = undefined;
    }
    return this._put('load', (
      typeof count === 'boolean' ? {count: count} : undefined
    ), cb);
  }

  unload(cb) {
    return this._put('unload', undefined, cb);
  }

  setProperties(properties, cb) {
    return this._put('properties', properties, cb);
  }

  rename(name, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      `collection/${this.name}/rename`,
      {name},
      (err, res) => {
        if (err) callback(err);
        else {
          this.name = name;
          callback(null, res.body);
        }
      }
    );
    return promise;
  }

  rotate(cb) {
    return this._put('rotate', undefined, cb);
  }

  truncate(cb) {
    return this._put('truncate', undefined, cb);
  }

  drop(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.delete(
      `collection/${this.name}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  replace(documentHandle, newValue, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      this._documentPath(documentHandle),
      newValue,
      {...opts, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  update(documentHandle, newValue, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.patch(
      this._documentPath(documentHandle),
      newValue,
      {...opts, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  remove(documentHandle, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.delete(
      this._documentPath(documentHandle),
      {...opts, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  list(type, cb) {
    if (typeof type === 'function') {
      cb = type;
      type = undefined;
    }
    if (!type) type = 'id';
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      'document',
      {type, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.documents)
    );
    return promise;
  }

  all(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/all',
      {...opts, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, new ArrayCursor(this._connection, res.body))
    );
    return promise;
  }

  any(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/any',
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.document)
    );
    return promise;
  }

  first(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof opts === 'number') {
      opts = {count: opts};
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/first',
      {...opts, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.result)
    );
    return promise;
  }

  last(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof opts === 'number') {
      opts = {count: opts};
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/last',
      {...opts, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.result)
    );
    return promise;
  }

  byExample(example, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/by-example',
      {...opts, example, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, new ArrayCursor(this._connection, res.body))
    );
    return promise;
  }

  firstExample(example, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/first-example',
      {example, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.document)
    );
    return promise;
  }

  removeByExample(example, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/remove-by-example',
      {...opts, example, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  replaceByExample(example, newValue, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/replace-by-example',
      {...opts, example, newValue, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  updateByExample(example, newValue, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/update-by-example',
      {...opts, example, newValue, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  lookupByKeys(keys, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/lookup-by-keys',
      {keys, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.documents)
    );
    return promise;
  }

  removeByKeys(keys, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/remove-by-keys',
      {...opts, keys, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  import(data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.request(
      {
        method: 'POST',
        path: 'import',
        body: data,
        ld: Boolean(!opts || opts.type !== 'array'),
        qs: {type: 'auto', ...opts, collection: this.name}
      },
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  indexes(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      'index',
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.indexes)
    );
    return promise;
  }

  index(indexHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      `index/${this._indexHandle(indexHandle)}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  createIndex(details, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'index',
      details,
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  dropIndex(indexHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.delete(
      `index/${this._indexHandle(indexHandle)}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  createCapConstraint(size, cb) {
    if (typeof size === 'number') {
      size = {size: size};
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'index',
      {...size, type: 'cap'},
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  createHashIndex(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (typeof opts === 'boolean') {
      opts = {unique: opts};
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'index',
      {unique: false, ...opts, type: 'hash', fields: fields},
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  createSkipList(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (typeof opts === 'boolean') {
      opts = {unique: opts};
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'index',
      {unique: false, ...opts, type: 'skiplist', fields: fields},
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  createGeoIndex(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'index',
      {...opts, fields, type: 'geo'},
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  createFulltextIndex(fields, minLength, cb) {
    if (typeof minLength === 'function') {
      cb = minLength;
      minLength = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (minLength) minLength = Number(minLength);
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'index',
      {fields, minLength, type: 'fulltext'},
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  fulltext(attribute, query, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (!opts) opts = {};
    if (opts.index) opts.index = this._indexHandle(opts.index);
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      'simple/fulltext',
      {...opts, attribute, query, collection: this.name},
      (err, res) => err ? callback(err) : callback(null, new ArrayCursor(this._connection, res.body))
    );
    return promise;
  }
}

class DocumentCollection extends BaseCollection {
  constructor(...args) {
    super(...args);
    this.type = types.DOCUMENT_COLLECTION;
  }

  _documentPath(documentHandle) {
    return `document/${this._documentHandle(documentHandle)}`;
  }

  document(documentHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      `document/${this._documentHandle(documentHandle)}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  save(data, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'document',
      data,
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }
}

class EdgeCollection extends BaseCollection {
  constructor(...args) {
    super(...args);
    this.type = types.EDGE_COLLECTION;
  }

  _documentPath(documentHandle) {
    return `edge/${this._documentHandle(documentHandle)}`;
  }

  edge(documentHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      `edge/${this._documentHandle(documentHandle)}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  save(data, fromId, toId, cb) {
    if (typeof fromId === 'function') {
      cb = fromId;
      fromId = undefined;
    } else if (fromId) {
      data._from = this._documentHandle(fromId);
      data._to = this._documentHandle(toId);
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'edge',
      data,
      {
        collection: this.name,
        from: data._from,
        to: data._to
      },
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  _edges(documentHandle, direction, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      `edges/${this.name}`,
      {direction, vertex: this._documentHandle(documentHandle)},
      (err, res) => err ? callback(err) : callback(null, res.body.edges)
    );
    return promise;
  }

  edges(vertex, cb) {
    return this._edges(vertex, undefined, cb);
  }

  inEdges(vertex, cb) {
    return this._edges(vertex, 'in', cb);
  }

  outEdges(vertex, cb) {
    return this._edges(vertex, 'out', cb);
  }

  traversal(startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'traversal',
      {...opts, startVertex, edgeCollection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.result)
    );
    return promise;
  }
}

export default function construct(connection, body) {
  const Collection = (
    body.type === types.EDGE_COLLECTION
    ? EdgeCollection
    : DocumentCollection
  );
  return new Collection(connection, body.name);
}

export {
  EdgeCollection,
  DocumentCollection,
  BaseCollection as _BaseCollection,
  types as _types
};
