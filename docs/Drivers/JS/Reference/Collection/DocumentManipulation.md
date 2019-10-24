# Manipulating documents

These functions implement the
[HTTP API for manipulating documents](https://www.arangodb.com/docs/stable/http/document.html).

Note that passing a document or `_id` from a different collection as a _selector_
for a document in the current collection will result in an error being thrown.

## collection.documentId

`collection.documentId(selector): string`

Returns the document `_id` for the given _selector_ in this collection.

**Arguments**

- **selector**: `string`

  The handle of the document. This can be either the `_id` or the `_key` of a
  document in the collection, or a document (i.e. an object with an `_id` or
  `_key` property).

Returns the `_id` for the given document.

**Examples**

```js
const db = new Database();
const collection = db.collection("my-docs");

let documentId = collection.documentId("some-key"); // my-docs/some-key
// - or -
documentId = collection.documentId("my-docs/some-key");
// - or -
documentId = collection.documentId({ _key: "some-key" });
// - or -
documentId = collection.documentId({ _id: "my-docs/some-key" });

// The following will throw because the collection name does not match:
documentId = collection.documentId({ _id: "elsewhere/some-key" }); // THROWS!
documentId = collection.documentId("elsewhere/some-key"); // THROWS!
```

## collection.documentExists

`async collection.documentExists(selector): boolean`

Checks whether the document matching the given _selector_ exists.

**Arguments**

- **selector**: `string`

  The handle of the document to retrieve. This can be either the `_id` or the
  `_key` of a document in the collection, or a document (i.e. an object with an
  `_id` or `_key` property).

Returns a boolean indicating the document's existence.

**Examples**

```js
const db = new Database();
const collection = db.collection("my-docs");

const exists = await collection.documentExists("some-key");
if (exists === false) {
  // the document does not exist
}
```

## collection.document

`async collection.document(selector, [options]): Document`

Retrieves the document matching the given _selector_ from the collection.

**Arguments**

- **selector**: `string`

  The handle of the document to retrieve. This can be either the `_id` or the
  `_key` of a document in the collection, or a document (i.e. an object with an
  `_id` or `_key` property).

- **options**: `object` (optional)

  An object with the following properties:

  - **graceful**: `boolean` (Default: `false`)

    If set to `true`, the method will return `null` instead of throwing an
    error if the document does not exist.

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
const collection = db.collection("my-docs");

try {
  const doc = await collection.document("some-key");
  // the document exists
  assert.equal(doc._key, "some-key");
  assert.equal(doc._id, "my-docs/some-key");
} catch (err) {
  // something went wrong or
  // the document does not exist
}

// -- or --

try {
  const doc = await collection.document("my-docs/some-key");
  // the document exists
  assert.equal(doc._key, "some-key");
  assert.equal(doc._id, "my-docs/some-key");
} catch (err) {
  // something went wrong or
  // the document does not exist
}

// -- or --

const doc = await collection.document("some-key", true);
if (doc === null) {
  // the document does not exist
}
```

## collection.save

`async collection.save(data, [options]): CollectionSaveResult`

Creates a new document with the given _data_.

**Arguments**

- **data**: `object`

  The data of the new document, may include a `_key`.

- **options**: `object` (optional)

  If _options_ is set, it must be an object with any of the following properties:

  - **waitForSync**: `boolean` (Default: `false`)

    Wait until document has been synced to disk.

  - **returnNew**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete new document under the
    attribute `new` in the result.

  - **returnOld**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete old document under the
    attribute `old` in the result.

  - **silent**: `boolean` (Default: `false`)

    If set to true, an empty object will be returned as response. No meta-data
    will be returned for the created document. This option can be used to save
    some network traffic.

  - **overwrite**: `boolean` (Default: `false`)

    {% hint 'warning' %}
    This option is only available when targeting ArangoDB v3.4.0 and later.
    {% endhint %}

    If set to true, the insert becomes a replace-insert. If a document with the
    same `_key` already exists the new document is not rejected with unique
    constraint violated but will replace the old document.

Returns an object.

If **silent** was not set to `true`, the object will include the new document's
`_id`, `_key` and `_rev` properties.

If **returnNew** was set to `true`, the object will include a full copy of the
stored document in the `new` property.

If **returnOld** and **overwrite** were set to `true` and the inserted document
replaced an existing document, the object will include a full copy of the
previous document in the `old` property.

**Examples**

```js
const db = new Database();
const collection = db.collection("my-docs");
const data = { some: "data" };
const info = await collection.save(data);
assert.equal(info._id, "my-docs/" + info._key);
const doc2 = await collection.document(info);
assert.equal(doc2._id, info._id);
assert.equal(doc2._rev, info._rev);
assert.equal(doc2.some, data.some);

// -- or --

const db = new Database();
const collection = db.collection("my-docs");
const data = { some: "data" };
const options = { returnNew: true };
const doc = await collection.save(data, options);
assert.equal(doc1._id, "my-docs/" + doc1._key);
assert.equal(doc1.new.some, data.some);
```

## collection.replace

`async collection.replace(selector, newValue, [options]): CollectionSaveResult`

Replaces the content of the document matching the given _selector_ with the
given _newValue_ and returns an object containing the document's metadata.

**Arguments**

- **selector**: `string`

  The handle of the document to replace. This can either be the `_id` or the
  `_key` of a document in the collection, or a document (i.e. an object with an
  `_id` or `_key` property).

- **newValue**: `DocumentData`

  The new data of the document.

- **options**: `object` (optional)

  If _options_ is set, it must be an object with any of the following properties:

  - **waitForSync**: `boolean` (Default: `false`)

    Wait until document has been synced to disk.

  - **returnNew**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete new document under the
    attribute `new` in the result.

  - **returnOld**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete old document under the
    attribute `old` in the result.

  - **silent**: `boolean` (Default: `false`)

    If set to true, an empty object will be returned as response. No meta-data
    will be returned for the created document. This option can be used to save
    some network traffic.

  - **ignoreRevs**: `boolean` (Default: `true`)

    If set to `false`, the existing document will only be replaced if its
    `_rev` attribute matches `newValue._rev`.

Returns an object.

If **silent** was not set to `true`, the object will include the new document's
`_id`, `_key` and `_rev` properties.

If **returnNew** was set to `true`, the object will include a full copy of the
stored document in the `new` property.

If **returnOld** was set to `true`, the object will include a full copy of the
previous document in the `old` property.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const data = { number: 1, hello: "world" };
const info1 = await collection.save(data);
const info2 = await collection.replace(info1, { number: 2 });
assert.equal(info2._id, info1._id);
assert.notEqual(info2._rev, info1._rev);
const doc = await collection.document(info1);
assert.equal(doc._id, info1._id);
assert.equal(doc._rev, info2._rev);
assert.equal(doc.number, 2);
assert.equal(doc.hello, undefined);
```

## collection.update

`async collection.update(selector, newValue, [options]): CollectionSaveResult`

Updates (merges) the content of the document matching the given _selector_
with the given _newValue_.

**Arguments**

- **selector**: `string`

  Handle of the document to update. This can be either the `_id` or the `_key`
  of a document in the collection, or a document (i.e. an object with an `_id`
  or `_key` property).

- **newValue**: `DocumentData`

  The new data of the document.

- **options**: `object` (optional)

  If _options_ is set, it must be an object with any of the following properties:

  - **waitForSync**: `boolean` (Default: `false`)

    Wait until document has been synced to disk.

  - **returnNew**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete new document under the
    attribute `new` in the result.

  - **returnOld**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete old document under the
    attribute `old` in the result.

  - **silent**: `boolean` (Default: `false`)

    If set to true, an empty object will be returned as response. No meta-data
    will be returned for the created document. This option can be used to save
    some network traffic.

  - **ignoreRevs**: `boolean` (Default: `true`)

    If set to `false`, the existing document will only be replaced if its
    `_rev` attribute matches `newValue._rev`.

Returns an object.

If **silent** was not set to `true`, the object will include the new document's
`_id`, `_key` and `_rev` properties.

If **returnNew** was set to `true`, the object will include a full copy of the
stored document in the `new` property.

If **returnOld** was set to `true`, the object will include a full copy of the
previous document in the `old` property.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const doc = { number: 1, hello: "world" };
const doc1 = await collection.save(doc);
const doc2 = await collection.update(doc1, { number: 2 });
assert.equal(doc2._id, doc1._id);
assert.notEqual(doc2._rev, doc1._rev);
const doc3 = await collection.document(doc2);
assert.equal(doc3._id, doc2._id);
assert.equal(doc3._rev, doc2._rev);
assert.equal(doc3.number, 2);
assert.equal(doc3.hello, doc.hello);
```

## collection.bulkUpdate

`async collection.bulkUpdate(documents, [options]): TODO`

Updates (merges) the content of the documents with the given _documents_ and
returns an array containing the documents' metadata.

**Arguments**

- **documents**: `Array<object>`

  Documents to update. Each object must have either the `_id` or the `_key`
  property.

- **options**: `object` (optional)

  If _options_ is set, it must be an object with any of the following properties:

  - **waitForSync**: `boolean` (Default: `false`)

    Wait until document has been synced to disk.

  - **keepNull**: `boolean` (Default: `true`)

    If set to `false`, properties with a value of `null` indicate that a
    property should be deleted.

  - **mergeObjects**: `boolean` (Default: `true`)

    If set to `false`, object properties that already exist in the old document
    will be overwritten rather than merged. This does not affect arrays.

  - **returnOld**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete previous revision of the
    changed documents under the attribute `old` in the result.

  - **returnNew**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete new documents under the
    attribute `new` in the result.

  - **ignoreRevs**: `boolean` (Default: `true`)

    By default, or if this is set to true, the `_rev` attributes in the given
    documents are ignored. If this is set to false, then any `_rev` attribute
    given in a body document is taken as a precondition. The document is only
    updated if the current revision is the one specified.

For more information on the _options_ object, see the
[HTTP API documentation for working with documents](https://docs.arangodb.com/latest/HTTP/Document/WorkingWithDocuments.html).

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");
const doc1 = { number: 1, hello: "world1" };
const info1 = await collection.save(doc1);
const doc2 = { number: 2, hello: "world2" };
const info2 = await collection.save(doc2);
const result = await collection.bulkUpdate(
  [{ _key: info1._key, number: 3 }, { _key: info2._key, number: 4 }],
  { returnNew: true }
);
```

## collection.remove

`async collection.remove(selector, [options]): CollectionRemoveResult`

Deletes the document matching the given _selector_ from the collection.

**Arguments**

- **selector**: `string`

  The handle of the document to delete. This can be either the `_id` or the
  `_key` of a document in the collection, or a document (i.e. an object with an
  `_id` or `_key` property).

- **options**: `object` (optional)

  If _options_ is set, it must be an object with any of the following properties:

  - **waitForSync**: `boolean` (Default: `false`)

    Wait until document has been synced to disk.

  - **returnOld**: `boolean` (Default: `false`)

    If set to `true`, return additionally the complete old document under the
    attribute `old` in the result.

  - **silent**: `boolean` (Default: `false`)

    If set to true, an empty object will be returned as response. No meta-data
    will be returned for the created document. This option can be used to save
    some network traffic.

Returns an object.

If **silent** was not set to `true`, the object will include the old document's
`_id`, `_key` and `_rev` properties.

If **returnOld** and **overwrite** were set to `true` and the inserted document
replaced an existing document, the object will include a full copy of the
previous document in the `old` property.

**Examples**

```js
const db = new Database();
const collection = db.collection("some-collection");

await collection.remove("some-doc");
// document 'some-collection/some-doc' no longer exists

// -- or --

await collection.remove("some-collection/some-doc");
// document 'some-collection/some-doc' no longer exists
```
