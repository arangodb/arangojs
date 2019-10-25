# Manipulating the collection

These functions implement the
[HTTP API for modifying collections](https://www.arangodb.com/docs/stable/http/collection-modifying.html).

## collection.create

`async collection.create(options?): CollectionProperties`

Creates a collection with the given _options_ and this instance's name.

This is a shorthand for calling `database.createCollection` with this
collection's name and the given _options_, but returning the collection
properties instead of a new _Collection_ instance.

**Examples**

```js
const db = new Database();
const collection = db.collection("potatoes");
await collection.create();
// the document collection "potatoes" now exists

// -- or --

const collection = db.collection("friends");
await collection.create({
  waitForSync: true // always sync document changes to disk
});
// the edge collection "friends" now exists
```

## collection.load

`async collection.load(count?): CollectionLoadResult`

Tells the server to load the collection into memory.

**Arguments**

- **count**: `boolean` (Default: `true`)

  If set to `false`, the return value will not include the number of documents
  in the collection (which may speed up the process).

Returns an object. If **count** is not explicitly set to `false`, the object includes the following property:

- **count**: `number`

  The number of documents in the collection.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
await collection.load(false);
// the collection has now been loaded into memory
```

## collection.unload

`async collection.unload(): CollectionMetadata`

Tells the server to remove the collection from memory.

Returns an object with all properties returned by `collection.get()`.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
await collection.unload();
// the collection has now been unloaded from memory
```

## collection.properties

`async collection.properties(properties): CollectionProperties`

Replaces the properties of the collection.

**Arguments**

- **properties**: `object`

  TODO
  [HTTP API for modifying collections](https://www.arangodb.com/docs/stable/http/collection-modifying.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const result = await collection.setProperties({ waitForSync: true });
assert.equal(result.waitForSync, true);
// the collection will now wait for data being written to disk
// whenever a document is changed
```

## collection.rename

`async collection.rename(name): CollectionMetadata`

Renames the collection. The _Collection_ instance will automatically update its
name when the rename succeeds.

Returns an object with all properties returned by `collection.get()`.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const result = await collection.rename("new-collection-name");
assert.equal(result.name, "new-collection-name");
assert.equal(collection.name, result.name);
// result contains additional information about the collection
```

## collection.rotate

`async collection.rotate(): CollectionRotateResult`

Rotates the journal of the collection.

Returns an object with the following properties:

- **result**: `boolean`

  TODO

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const data = await collection.rotate();
// data.result will be true if rotation succeeded
```

## collection.truncate

`async collection.truncate(): CollectionMetadata`

Deletes **all documents** in the collection in the database.

Returns an object with all properties returned by `collection.get()`.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
await collection.truncate();
// the collection "some-collection" is now empty
```

## collection.drop

`async collection.drop(options?): TODO`

Deletes the collection from the database.

**Arguments**

- **options**: `object` (optional)

  An object with the following properties:

  - **isSystem**: `Boolean` (Default: `false`)

    Whether the collection should be dropped even if it is a system collection. If not set to `true`, the server will refuse to drop system collections even if the user has the necessary permissions.

TODO Returns an object.
[HTTP API documentation for dropping collections](https://www.arangodb.com/docs/stable/http/collection-creating.html#drops-a-collection).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
await collection.drop();
// the collection "some-collection" no longer exists
```
