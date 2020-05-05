# EdgeCollection API

The _EdgeCollection API_ extends the
[_Collection API_](README.md) with the following methods.

## collection.save

```js
const db = new Database();
const collection = db.collection("edges");
const info = await collection.save(
  {
    someData: "data",
    _from: "vertices/start-vertex",
    _to: "vertices/end-vertex",
  },
  {
    returnNew: true,
  }
);

assert.equal(info._id, "edges/" + info._key);
const edge = info.new;
assert.equal(edge._key, info._key);
assert.equal(edge._rev, info._rev);
assert.equal(edge.someData, data.someData);
```

## collection.edges

`async collection.edges(selector): object`

Retrieves a list of all edges of the documentmatching the given _selector_.

**Arguments**

- **selector**: `string`

  The handle of the document to retrieve the edges of. This can be either the
  `_id` of a document in the database, the `_key` of an edge in the collection,
  or a document (i.e. an object with an `_id` or `_key` property).

Returns an object with the following properties:

- **edges**: `Array<Edge>`

  All edges found for the given selector.

- **stats**: `object`

  An object with the following properties:

  - **scannedIndex**: `number`

    TODO

  - **filtered**: `number`

    TODO

**Examples**

```js
const db = new Database();
const collection = db.collection("edges");
await collection.import([
  ["_key", "_from", "_to"],
  ["x", "vertices/a", "vertices/b"],
  ["y", "vertices/a", "vertices/c"],
  ["z", "vertices/d", "vertices/a"],
]);
const edges = await collection.edges("vertices/a");
assert.equal(edges.length, 3);
assert.deepEqual(
  edges.map((edge) => edge._key),
  ["x", "y", "z"]
);
```

## collection.inEdges

`async collection.inEdges(selector): object`

Retrieves a list of all incoming edges of the document with the given
_selector_.

**Arguments**

- **selector**: `string`

  The handle of the document to retrieve the edges of. This can be either the
  `_id` of a document in the database, the `_key` of an edge in the collection,
  or a document (i.e. an object with an `_id` or `_key` property).

Returns an object with the following properties:

- **edges**: `Array<Edge>`

  All incoming edges found for the given selector.

- **stats**: `object`

  An object with the following properties:

  - **scannedIndex**: `number`

    TODO

  - **filtered**: `number`

    TODO

**Examples**

```js
const db = new Database();
const collection = db.collection("edges");
await collection.import([
  ["_key", "_from", "_to"],
  ["x", "vertices/a", "vertices/b"],
  ["y", "vertices/a", "vertices/c"],
  ["z", "vertices/d", "vertices/a"],
]);
const edges = await collection.inEdges("vertices/a");
assert.equal(edges.length, 1);
assert.equal(edges[0]._key, "z");
```

## collection.outEdges

`async collection.outEdges(selector): object`

Retrieves a list of all outgoing edges of the document with the given
_selector_.

**Arguments**

- **selector**: `string`

  The handle of the document to retrieve the edges of. This can be either the
  `_id` of a document in the database, the `_key` of an edge in the collection,
  or a document (i.e. an object with an `_id` or `_key` property).

Returns an object with the following properties:

- **edges**: `Array<Edge>`

  All outgoing edges found for the given selector.

- **stats**: `object`

  An object with the following properties:

  - **scannedIndex**: `number`

    TODO

  - **filtered**: `number`

    TODO

**Examples**

```js
const db = new Database();
const collection = db.collection("edges");
await collection.import([
  ["_key", "_from", "_to"],
  ["x", "vertices/a", "vertices/b"],
  ["y", "vertices/a", "vertices/c"],
  ["z", "vertices/d", "vertices/a"],
]);
const edges = await collection.outEdges("vertices/a");
assert.equal(edges.length, 2);
assert.deepEqual(
  edges.map((edge) => edge._key),
  ["x", "y"]
);
```

## collection.traversal

`async collection.traversal(startVertex, options): object`

Performs a traversal starting from the given _startVertex_ and following edges
contained in this edge collection.

**Arguments**

- **startVertex**: `string`

  The handle of the start vertex. This can be either the `_id` of a document in
  the database, the `_key` of an edge in the collection, or a document (i.e. an
  object with an `_id` or `_key` property).

- **options**: `object`

  An object with the following properties:

  - **graphName**: `string` (optional)

    TODO

  - **edgeCollection**: `string` (optional)

    TODO

  - **init**: `string` (optional)

    A function TODO. Note that this function will be executed inside ArangoDB and does not have access to any variables other than its arguments.

  - **filter**: `string` (optional)

    A function TODO. Note that this function will be executed inside ArangoDB and does not have access to any variables other than its arguments.

  - **sort**: `string` (optional)

    A function TODO. Note that this function will be executed inside ArangoDB and does not have access to any variables other than its arguments.

  - **visitor**: `string` (optional)

    A function TODO. Note that this function will be executed inside ArangoDB and does not have access to any variables other than its arguments.

  - **expander**: `string` (optional)

    A function TODO. Note that this function will be executed inside ArangoDB and does not have access to any variables other than its arguments.

  - **direction**: `"inbound" | "outbound" | "any"` (optional)

    TODO

  - **itemOrder**: `"forward" | "backward"` (optional)

    TODO

  - **strategy**: `"depthfirst" | "breadthfirst"` (optional)

    TODO

  - **order**: `"preorder" | "postorder" | "preorder-expander"` (optional)

    TODO

  - **uniqueness**: `object` (optional)

    TODO

    An object with the following properties:

    - **vertices**: `string` (optional)

      TODO

      One of `"none"`, `"global"`, `"path"`.

    - **edges**: `string` (optional)

      TODO

      One of `"none"`, `"global"`, `"path"`.

  - **minDepth**: `number` (optional)

    TODO

  - **maxDepth**: `number` (optional)

    TODO

  - **maxIterations**: `number` (optional)

    TODO
    [HTTP API documentation](https://www.arangodb.com/docs/stable/http/traversal.html).

Returns an object TODO.

**Examples**

```js
const db = new Database();
const collection = db.collection("edges");
await collection.import([
  ["_key", "_from", "_to"],
  ["x", "vertices/a", "vertices/b"],
  ["y", "vertices/b", "vertices/c"],
  ["z", "vertices/c", "vertices/d"],
]);
const result = await collection.traversal("vertices/a", {
  direction: "outbound",
  visitor: "result.vertices.push(vertex._key);",
  init: "result.vertices = [];",
});
assert.deepEqual(result.vertices, ["a", "b", "c", "d"]);
```
