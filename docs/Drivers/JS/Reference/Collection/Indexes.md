# Manipulating indexes

These functions implement the
[HTTP API for manipulating indexes](https://www.arangodb.com/docs/stable/http/indexes.html).

## collection.ensureIndex

`async collection.ensureIndex(options): TODO`

Creates an arbitrary index on the collection.

**Arguments**

- **options**: `object`

  For information on the possible properties of the _options_ object, see the
  [HTTP API for manipulating indexes](https://www.arangodb.com/docs/stable/http/indexes-working-with.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const index = await collection.ensureIndex({
  type: "hash",
  fields: ["a", "a.b"]
});
// the index has been created with the handle `index.id`
```

## collection.ensureHashIndex

`async collection.ensureHashIndex(fields, [opts]): TODO`

Creates a hash index on the collection.

**Arguments**

- **fields**: `Array<string>`

  An array of names of document fields on which to create the index. If the
  value is a string, it will be wrapped in an array automatically.

- **opts**: `object` (optional)

  Additional options for this index. If the value is a boolean, it will be
  interpreted as _opts.unique_.

For more information on hash indexes, see the
[HTTP API for hash indexes](https://www.arangodb.com/docs/stable/http/indexes-hash.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");

const index = await collection.ensureHashIndex("favorite-color");
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["favorite-color"]);

// -- or --

const index = await collection.ensureHashIndex(["favorite-color"]);
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["favorite-color"]);
```

## collection.ensureSkipList

`async collection.ensureSkipList(fields, [opts]): TODO`

Creates a skiplist index on the collection.

**Arguments**

- **fields**: `Array<string>`

  An array of names of document fields on which to create the index. If the
  value is a string, it will be wrapped in an array automatically.

- **opts**: `object` (optional)

  Additional options for this index. If the value is a boolean, it will be
  interpreted as _opts.unique_.

For more information on skiplist indexes, see the
[HTTP API for skiplist indexes](https://www.arangodb.com/docs/stable/http/indexes-skiplist.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");

const index = await collection.ensureSkipList("favorite-color");
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["favorite-color"]);

// -- or --

const index = await collection.ensureSkipList(["favorite-color"]);
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["favorite-color"]);
```

## collection.ensureGeoIndex

`async collection.ensureGeoIndex(fields, [opts]): TODO`

Creates a geo-spatial index on the collection.

**Arguments**

- **fields**: `Array<string>`

  An array of names of document fields on which to create the index. Currently,
  geo indexes must cover exactly one field. If the value is a string, it will be
  wrapped in an array automatically.

- **opts**: `object` (optional)

  An object containing additional properties of the index.

For more information on the properties of the _opts_ object see the
[HTTP API for manipulating geo indexes](https://www.arangodb.com/docs/stable/http/indexes-geo.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");

const index = await collection.ensureGeoIndex(["latitude", "longitude"]);
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["longitude", "latitude"]);

// -- or --

const index = await collection.ensureGeoIndex("location", { geoJson: true });
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["location"]);
```

## collection.ensureFulltextIndex

`async collection.ensureFulltextIndex(fields, [minLength]): TODO`

Creates a fulltext index on the collection.

**Arguments**

- **fields**: `Array<string>`

  An array of names of document fields on which to create the index. Currently,
  fulltext indexes must cover exactly one field. If the value is a string, it
  will be wrapped in an array automatically.

- **minLength** (optional):

  Minimum character length of words to index. Uses a server-specific default
  value if not specified.

For more information on fulltext indexes, see
[the HTTP API for fulltext indexes](https://www.arangodb.com/docs/stable/http/indexes-fulltext.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");

const index = await collection.ensureFulltextIndex("description");
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["description"]);

// -- or --

const index = await collection.ensureFulltextIndex(["description"]);
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["description"]);
```

## collection.ensurePersistentIndex

`async collection.ensurePersistentIndex(fields, [opts]): TODO`

Creates a persistent index on the collection. Persistent indexes are similarly
in operation to skiplist indexes, only that these indexes are in disk as opposed
to in memory. This reduces memory usage and DB startup time, with the trade-off
being that it will always be orders of magnitude slower than in-memory indexes.

**Arguments**

- **fields**: `Array<string>`

  An array of names of document fields on which to create the index.

- **opts**: `object` (optional)

  An object containing additional properties of the index.

For more information on the properties of the _opts_ object see
[the HTTP API for manipulating Persistent indexes](https://www.arangodb.com/docs/stable/http/indexes-persistent.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");

const index = await collection.ensurePersistentIndex(["name", "email"]);
// the index has been created with the handle `index.id`
assert.deepEqual(index.fields, ["name", "email"]);
```

## collection.index

`async collection.index(indexHandle): TODO`

Fetches information about the index with the given _indexHandle_ and returns it.

**Arguments**

- **indexHandle**: `string`

  The handle of the index to look up. This can either be a fully-qualified
  identifier or the collection-specific key of the index. If the value is an
  object, its _id_ property will be used instead.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const index = await collection.ensureFulltextIndex("description");
const result = await collection.index(index.id);
assert.equal(result.id, index.id);
// result contains the properties of the index

// -- or --

const result = await collection.index(index.id.split("/")[1]);
assert.equal(result.id, index.id);
// result contains the properties of the index
```

## collection.indexes

`async collection.indexes(): Array<TODO>`

Fetches a list of all indexes on this collection.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
await collection.ensureFulltextIndex("description");
const indexes = await collection.indexes();
assert.equal(indexes.length, 1);
// indexes contains information about the index
```

## collection.dropIndex

`async collection.dropIndex(indexHandle): TODO`

Deletes the index with the given _indexHandle_ from the collection.

**Arguments**

- **indexHandle**: `string`

  The handle of the index to delete. This can either be a fully-qualified
  identifier or the collection-specific key of the index. If the value is an
  object, its _id_ property will be used instead.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const index = await collection.ensureFulltextIndex("description");
await collection.dropIndex(index.id);
// the index has been removed from the collection

// -- or --

await collection.dropIndex(index.id.split("/")[1]);
// the index has been removed from the collection
```
