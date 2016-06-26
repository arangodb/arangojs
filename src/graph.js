import {
  EdgeCollection,
  _BaseCollection as BaseCollection,
  _types as types
} from './collection'

class GraphVertexCollection extends BaseCollection {
  constructor (connection, name, graph) {
    super(connection, name)
    this.type = types.DOCUMENT_COLLECTION
    this.graph = graph
    this._gharial = this._api.route(`/gharial/${this.graph.name}/vertex`)
  }

  _documentPath (documentHandle) {
    return `/document/${this._documentHandle(documentHandle)}`
  }

  remove (documentHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.delete(
      `/${this._documentHandle(documentHandle)}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    )
    return promise
  }

  vertex (documentHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.get(
      `/${this._documentHandle(documentHandle)}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    )
    return promise
  }

  save (data, cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.post(
      this.name,
      data,
      (err, res) => err ? callback(err) : callback(null, res.body)
    )
    return promise
  }
}

class GraphEdgeCollection extends EdgeCollection {
  constructor (connection, name, graph) {
    super(connection, name)
    this.type = types.EDGE_COLLECTION
    this.graph = graph
    this._gharial = this._api.route(`/gharial/${this.graph.name}/edge`)
  }

  remove (documentHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.delete(
      `/${this._documentHandle(documentHandle)}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    )
    return promise
  }

  edge (documentHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.get(
      `/${this._documentHandle(documentHandle)}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    )
    return promise
  }

  save (data, fromId, toId, cb) {
    if (typeof fromId === 'function') {
      cb = fromId
      fromId = undefined
    } else if (fromId) {
      data._from = this._documentHandle(fromId)
      data._to = this._documentHandle(toId)
    }
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.post(
      this.name,
      data,
      (err, res) => err ? callback(err) : callback(null, res.body)
    )
    return promise
  }
}

export default class Graph {
  constructor (connection, name) {
    this.name = name
    this._connection = connection
    this._api = this._connection.route('/_api')
    this._gharial = this._api.route(`/gharial/${this.name}`)
  }

  get (cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.get(
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    )
    return promise
  }

  create (properties, cb) {
    if (typeof properties === 'function') {
      cb = properties
      properties = undefined
    }
    const {promise, callback} = this._connection.promisify(cb)
    this._api.post(
      '/gharial',
      {...properties, name: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    )
    return promise
  }

  drop (dropCollections, cb) {
    if (typeof dropCollections === 'function') {
      cb = dropCollections
      dropCollections = undefined
    }
    if (typeof dropCollections !== 'boolean') dropCollections = false
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.delete(
      {dropCollections},
      (err, res) => err ? callback(err) : callback(null, res.body)
    )
    return promise
  }

  vertexCollection (collectionName) {
    return new GraphVertexCollection(this._connection, collectionName, this)
  }

  addVertexCollection (collectionName, cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.post(
      '/vertex',
      {collection: collectionName},
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    )
    return promise
  }

  removeVertexCollection (collectionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection
      dropCollection = undefined
    }
    const {promise, callback} = this._connection.promisify(cb)
    if (typeof dropCollection !== 'boolean') dropCollection = false
    this._gharial.delete(
      `/vertex/${collectionName}`,
      {dropCollection},
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    )
    return promise
  }

  edgeCollection (collectionName) {
    return new GraphEdgeCollection(this._connection, collectionName, this)
  }

  addEdgeDefinition (definition, cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.post(
      '/edge',
      definition,
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    )
    return promise
  }

  replaceEdgeDefinition (definitionName, definition, cb) {
    const {promise, callback} = this._connection.promisify(cb)
    this._gharial.put(
      `/edge/${definitionName}`,
      definition,
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    )
    return promise
  }

  removeEdgeDefinition (definitionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection
      dropCollection = undefined
    }
    const {promise, callback} = this._connection.promisify(cb)
    if (typeof dropCollection !== 'boolean') dropCollection = false
    this._gharial.delete(
      `edge/${definitionName}`,
      {dropCollection},
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    )
    return promise
  }

  traversal (startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = undefined
    }
    const {promise, callback} = this._connection.promisify(cb)
    this._api.post(
      '/traversal',
      {...opts, startVertex, graphName: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body.result)
    )
    return promise
  }
}

export {
  GraphVertexCollection as VertexCollection,
  GraphEdgeCollection as EdgeCollection
}
