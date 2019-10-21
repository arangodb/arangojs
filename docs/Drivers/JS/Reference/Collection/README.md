# Collection API

These functions implement the
[HTTP API for manipulating collections](https://www.arangodb.com/docs/stable/http/collection.html).

The _Collection API_ is implemented by all _Collection_ instances, regardless of
their specific type. I.e. it represents a shared subset between instances of
[_DocumentCollection_](DocumentCollection.md),
[_EdgeCollection_](EdgeCollection.md),
[_GraphVertexCollection_](../Graph/VertexCollection.md) and
[_GraphEdgeCollection_](../Graph/EdgeCollection.md).

## Getting information about the collection

See the
[HTTP API documentation](https://www.arangodb.com/docs/stable/http/collection-getting.html)
for details.

## collection.exists

`async collection.exists(): boolean`

Checks whether the collection exists.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const result = await collection.exists();
// result indicates whether the collection exists
```

### collection.get

`async collection.get(): Object`

Retrieves general information about the collection.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const data = await collection.get();
// data contains general information about the collection
```

### collection.getResponsibleShard

`async collection.getResponsibleShard(document): string`

Retrieves the `shardId` of the shard responsible for the given document.

**Arguments**

- **document**: `Object`

  Document to look up the responsible shard for. This can either be a full
  document or an object with at least those attributes present, which are
  used as shard key for the collection (Default: `_key`).

**Examples**

```js
const doc = await collection.document("abc123");
const shardId = await collection.getResponsibleShard(doc);
// -- or --
// Assuming the collection shard key is "_key" (the default)
const shardId = await collection.getResponsibleShard({ _key: "abc123" });
```

### collection.properties

`async collection.properties(): Object`

Retrieves the collection's properties.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const data = await collection.properties();
// data contains the collection's properties
```

### collection.count

`async collection.count(): Object`

Retrieves information about the number of documents in a collection.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const data = await collection.count();
// data contains the collection's count
```

### collection.figures

`async collection.figures(): Object`

Retrieves statistics for a collection.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const data = await collection.figures();
// data contains the collection's figures
```

### collection.revision

`async collection.revision(): Object`

Retrieves the collection revision ID.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const data = await collection.revision();
// data contains the collection's revision
```

### collection.checksum

`async collection.checksum([opts]): Object`

Retrieves the collection checksum.

**Arguments**

- **opts**: `Object` (optional)

  For information on the possible options see the
  [HTTP API for getting collection information](https://www.arangodb.com/docs/stable/http/collection-getting.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const data = await collection.checksum();
// data contains the collection's checksum
```
