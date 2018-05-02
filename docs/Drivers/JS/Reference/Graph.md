# Graph API

These functions implement the
[HTTP API for manipulating graphs](https://docs.arangodb.com/latest/HTTP/Gharial/index.html).

## graph.get

`async graph.get(): Object`

Retrieves general information about the graph.

**Examples**

```js
const db = new Database();
const graph = db.graph('some-graph');
const data = await graph.get();
// data contains general information about the graph
```

## graph.create

`async graph.create(properties): Object`

Creates a graph with the given _properties_ for this graph's name, then returns
the server response.

**Arguments**

* **properties**: `Object`

  For more information on the _properties_ object, see
  [the HTTP API documentation for creating graphs](https://docs.arangodb.com/latest/HTTP/Gharial/Management.html).

**Examples**

```js
const db = new Database();
const graph = db.graph('some-graph');
const info = await graph.create({
  edgeDefinitions: [{
    collection: 'edges',
    from: ['start-vertices'],
    to: ['end-vertices']
  }]
});
// graph now exists
```

## graph.drop

`async graph.drop([dropCollections]): Object`

Deletes the graph from the database.

**Arguments**

* **dropCollections**: `boolean` (optional)

  If set to `true`, the collections associated with the graph will also be
  deleted.

**Examples**

```js
const db = new Database();
const graph = db.graph('some-graph');
await graph.drop();
// the graph "some-graph" no longer exists
```

## Manipulating vertices

### graph.vertexCollection

`graph.vertexCollection(collectionName): GraphVertexCollection`

Returns a new [_GraphVertexCollection_ instance](GraphVertexCollection.md)
with the given name for this graph.

**Arguments**

* **collectionName**: `string`

  Name of the vertex collection.

**Examples**

```js
const db = new Database();
const graph = db.graph("some-graph");
const collection = graph.vertexCollection("vertices");
assert.equal(collection.name, "vertices");
// collection is a GraphVertexCollection
```

### graph.listVertexCollections

`async graph.listVertexCollections([excludeOrphans]): Array<Object>`

Fetches all vertex collections from the graph and returns an array of collection descriptions.

**Arguments**

* **excludeOrphans**: `boolean` (Default: `false`)

  Whether orphan collections should be excluded.

**Examples**

```js
const graph = db.graph('some-graph');

const collections = await graph.listVertexCollections();
// collections is an array of collection descriptions
// including orphan collections

// -- or --

const collections = await graph.listVertexCollections(true);
// collections is an array of collection descriptions
// not including orphan collections
```

### graph.vertexCollections

`async graph.vertexCollections([excludeOrphans]): Array<Collection>`

Fetches all vertex collections from the database and returns an array of _GraphVertexCollection_ instances for the collections.

**Arguments**

* **excludeOrphans**: `boolean` (Default: `false`)

  Whether orphan collections should be excluded.

**Examples**

```js
const graph = db.graph('some-graph');

const collections = await graph.vertexCollections()
// collections is an array of GraphVertexCollection
// instances including orphan collections

// -- or --

const collections = await graph.vertexCollections(true)
// collections is an array of GraphVertexCollection
// instances not including orphan collections
```

### graph.addVertexCollection

`async graph.addVertexCollection(collectionName): Object`

Adds the collection with the given _collectionName_ to the graph's vertex
collections.

**Arguments**

* **collectionName**: `string`

  Name of the vertex collection to add to the graph.

**Examples**

```js
const db = new Database();
const graph = db.graph('some-graph');
await graph.addVertexCollection('vertices');
// the collection "vertices" has been added to the graph
```

### graph.removeVertexCollection

`async graph.removeVertexCollection(collectionName, [dropCollection]): Object`

Removes the vertex collection with the given _collectionName_ from the graph.

**Arguments**

* **collectionName**: `string`

  Name of the vertex collection to remove from the graph.

* **dropCollection**: `boolean` (optional)

  If set to `true`, the collection will also be deleted from the database.

**Examples**

```js
const db = new Database();
const graph = db.graph('some-graph');
await graph.removeVertexCollection('vertices')
// collection "vertices" has been removed from the graph

// -- or --

await graph.removeVertexCollection('vertices', true)
// collection "vertices" has been removed from the graph
// the collection has also been dropped from the database
// this may have been a bad idea
```

## Manipulating edges

### graph.edgeCollection

`graph.edgeCollection(collectionName): GraphEdgeCollection`

Returns a new [_GraphEdgeCollection_ instance](GraphEdgeCollection.md) with
the given name bound to this graph.

**Arguments**

* **collectionName**: `string`

  Name of the edge collection.

**Examples**

```js
const db = new Database();
// assuming the collections "edges" and "vertices" exist
const graph = db.graph("some-graph");
const collection = graph.edgeCollection("edges");
assert.equal(collection.name, "edges");
// collection is a GraphEdgeCollection
```

### graph.addEdgeDefinition

`async graph.addEdgeDefinition(definition): Object`

Adds the given edge definition _definition_ to the graph.

**Arguments**

* **definition**: `Object`

  For more information on edge definitions see
  [the HTTP API for managing graphs](https://docs.arangodb.com/latest/HTTP/Gharial/Management.html).

**Examples**

```js
const db = new Database();
// assuming the collections "edges" and "vertices" exist
const graph = db.graph('some-graph');
await graph.addEdgeDefinition({
  collection: 'edges',
  from: ['vertices'],
  to: ['vertices']
});
// the edge definition has been added to the graph
```

### graph.replaceEdgeDefinition

`async graph.replaceEdgeDefinition(collectionName, definition): Object`

Replaces the edge definition for the edge collection named _collectionName_ with
the given _definition_.

**Arguments**

* **collectionName**: `string`

  Name of the edge collection to replace the definition of.

* **definition**: `Object`

  For more information on edge definitions see
  [the HTTP API for managing graphs](https://docs.arangodb.com/latest/HTTP/Gharial/Management.html).

**Examples**

```js
const db = new Database();
// assuming the collections "edges", "vertices" and "more-vertices" exist
const graph = db.graph('some-graph');
await graph.replaceEdgeDefinition('edges', {
  collection: 'edges',
  from: ['vertices'],
  to: ['more-vertices']
});
// the edge definition has been modified
```

### graph.removeEdgeDefinition

`async graph.removeEdgeDefinition(definitionName, [dropCollection]): Object`

Removes the edge definition with the given _definitionName_ form the graph.

**Arguments**

* **definitionName**: `string`

  Name of the edge definition to remove from the graph.

* **dropCollection**: `boolean` (optional)

  If set to `true`, the edge collection associated with the definition will also
  be deleted from the database.

**Examples**

```js
const db = new Database();
const graph = db.graph('some-graph');

await graph.removeEdgeDefinition('edges')
// the edge definition has been removed

// -- or --

await graph.removeEdgeDefinition('edges', true)
// the edge definition has been removed
// and the edge collection "edges" has been dropped
// this may have been a bad idea
```

### graph.traversal

`async graph.traversal(startVertex, opts): Object`

Performs a traversal starting from the given _startVertex_ and following edges
contained in any of the edge collections of this graph.

**Arguments**

* **startVertex**: `string`

  The handle of the start vertex. This can be either the `_id` of a document in
  the graph or a document (i.e. an object with an `_id` property).

* **opts**: `Object`

  See
  [the HTTP API documentation](https://docs.arangodb.com/latest/HTTP/Traversal/index.html)
  for details on the additional arguments.

  Please note that while _opts.filter_, _opts.visitor_, _opts.init_,
  _opts.expander_ and _opts.sort_ should be strings evaluating to well-formed
  JavaScript functions, it's not possible to pass in JavaScript functions
  directly because the functions need to be evaluated on the server and will be
  transmitted in plain text.

**Examples**

```js
const db = new Database();
const graph = db.graph('some-graph');
const collection = graph.edgeCollection('edges');
await collection.import([
  ['_key', '_from', '_to'],
  ['x', 'vertices/a', 'vertices/b'],
  ['y', 'vertices/b', 'vertices/c'],
  ['z', 'vertices/c', 'vertices/d']
])
const result = await graph.traversal('vertices/a', {
  direction: 'outbound',
  visitor: 'result.vertices.push(vertex._key);',
  init: 'result.vertices = [];'
});
assert.deepEqual(result.vertices, ['a', 'b', 'c', 'd']);
```
