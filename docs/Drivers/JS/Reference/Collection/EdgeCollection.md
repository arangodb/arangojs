# EdgeCollection API

The _EdgeCollection API_ extends the
[_Collection API_](README.md) with the following methods.

## collection.document

`async collection.document(selector, options?): Edge`

Alias: `collection.edge`.

Retrieves the edge matching the given _selector_ from the collection.

**Arguments**

- **selector**: `string`

  The handle of the edge to retrieve. This can be either the `_id` or the `_key`
  of an edge in the collection, or an edge (i.e. an object with an `_id` or
  `_key` property).

- **options**: `object` (optional)

  An object with the following properties:

  - **graceful**: `boolean` (Default: `false`)

    If set to `true`, the method will return `null` instead of throwing an
    error if the edge does not exist.

  - **allowDirtyRead**: `boolean` (Default: `false`)

    {% hint 'info' %}
    Dirty reads were introduced in ArangoDB 3.4 and are not supported by
    earlier versions of ArangoDB.
    {% endhint %}

    If set to `true`, the request will explicitly permit ArangoDB to return a
    potentially dirty or stale result and arangojs will load balance the
    request without distinguishing between leaders and followers.

If a boolean is passed instead of an options object, it will be interpreted as
the _graceful_ option.

Returns the document.

**Examples**

```js
const db = new Database();
const collection = db.collection("edges");

const edge = await collection.document("some-key");
// the edge exists
assert.equal(edge._key, "some-key");
assert.equal(edge._id, "edges/some-key");

// -- or --

const edge = await collection.document("edges/some-key");
// the edge exists
assert.equal(edge._key, "some-key");
assert.equal(edge._id, "edges/some-key");

// -- or --

const edge = await collection.document("some-key", true);
if (edge === null) {
  // the edge does not exist
}
```

## collection.save

`async collection.save(data, options?): TODO`

Creates a new edge with the given _data_ between the documents `data._from`
and `data._to`.

**Arguments**

- **data**: `object`

  The data of the new edge. The _data_ must include the properties
  `_from` and `_to`.

- **options**: `object` (optional)

  If _options_ is set, it must be an object with any of the following properties:

  - **waitForSync**: `boolean` (Default: `false`)

    Wait until edge has been synced to disk.

  - **returnNew**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete new edge under the
    attribute `new` in the result.

  - **returnOld**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete old edge under the
    attribute `old` in the result.

  - **silent**: `boolean` (Default: `false`)

    If set to true, an empty object will be returned as response. No meta-data
    will be returned for the created edge. This option can be used to save
    some network traffic.

  - **overwrite**: `boolean` (Default: `false`)

    {% hint 'warning' %}
    This option is only available when targeting ArangoDB v3.4.0 and later.
    {% endhint %}

    If set to true, the insert becomes a replace-insert. If a edge with the
    same `_key` already exists the new edge is not rejected with unique
    constraint violated but will replace the old edge.

Returns an object.

If **silent** was not set to `true`, the object will include the new edge's
`_id`, `_key` and `_rev` properties.

If **returnNew** was set to `true`, the object will include a full copy of the
stored edge in the `new` property.

If **returnOld** and **overwrite** were set to `true` and the inserted edge
replaced an existing edge, the object will include a full copy of the
previous edge in the `new` property.

**Examples**

```js
const db = new Database();
const collection = db.collection("edges");
const info = await collection.save(
  {
    someData: "data",
    _from: "verticies/start-vertex",
    _to: "vertices/end-vertex"
  },
  {
    returnNew: true
  }
);

assert.equal(info._id, "edges/" + info._key);
const edge = info.new;
assert.equal(edge._key, info._key);
assert.equal(edge._rev, info._rev);
assert.equal(edge.someData, data.someData);
```

## collection.edges

`async collection.edges(selector): CollectionEdgesResult`

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
  ["z", "vertices/d", "vertices/a"]
]);
const edges = await collection.edges("vertices/a");
assert.equal(edges.length, 3);
assert.deepEqual(edges.map(edge => edge._key), ["x", "y", "z"]);
```

## collection.inEdges

`async collection.inEdges(selector): CollectionEdgesResult`

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
  ["z", "vertices/d", "vertices/a"]
]);
const edges = await collection.inEdges("vertices/a");
assert.equal(edges.length, 1);
assert.equal(edges[0]._key, "z");
```

## collection.outEdges

`async collection.outEdges(selector): CollectionEdgesResult`

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
  ["z", "vertices/d", "vertices/a"]
]);
const edges = await collection.outEdges("vertices/a");
assert.equal(edges.length, 2);
assert.deepEqual(edges.map(edge => edge._key), ["x", "y"]);
```

## collection.traversal

`async collection.traversal(startVertex, options): TODO`

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

      One of: `"none"`, `"global"`, `"path"`.

    - **edges**: `string` (optional)

      TODO

      One of: `"none"`, `"global"`, `"path"`.

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
  ["z", "vertices/c", "vertices/d"]
]);
const result = await collection.traversal("vertices/a", {
  direction: "outbound",
  visitor: "result.vertices.push(vertex._key);",
  init: "result.vertices = [];"
});
assert.deepEqual(result.vertices, ["a", "b", "c", "d"]);
```
