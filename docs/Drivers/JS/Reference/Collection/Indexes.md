# Manipulating indexes

These functions implement the
[HTTP API for manipulating indexes](https://www.arangodb.com/docs/stable/http/indexes.html).

## collection.indexes

`async collection.indexes(): Array<object>`

Returns a list of all index descriptions for the collection.

## collection.index

`async collection.index(selector): object`

Returns an index description by name or `id` if it exists.

**Arguments**

- **selector**: `string`

  The name or `id` of the index.

## collection.ensureIndex

`async collection.ensureIndex(options): object`

Creates an index on the collection if it does not already exist.

**Arguments**

- **options**: `object`

  An object with the following properties:

  - **name**: `string` (optional)

    A unique name for this index.

  - **type**: `string`

    The type of index to create.
    Can be `"hash"`, `"skiplist"`, `"geo"`, `"fulltext"`, `"persistent"`
    or `"ttl"`.

  If the type is `"hash"` or `"skiplist"`, the object has the following additional properties:

  - **fields**: `Array<string>`

    An array of attribute paths.

  - **unique**: `boolean` (Default: `false`)

    If set to `true`, a unique index will be created.

  - **sparse**: `boolean` (Default: `false`)

    If set to `true`, the index will omit documents that do not contain at
    least one of the attribute paths and these documents will be ignored for
    uniqueness checks.

  - **deduplicate**: `boolean` (Default: `true`)

    If set to `false`, array values will not be deduplicated.

  If the type is `"geo"`, the object has the following additional properties:

  - **fields**: `Array<string>`

    If set to an array with a single attribute path, this must be the path
    to an attribute containing the latitude and longitude for each document
    as an array with at least two values.

    If set to an array with two attribute paths, these must be the paths to
    the latitude and longitude values for each document respectively.

  - **geoJson**: `boolean` (Default: `false`)

    If set to `true` and `fields` is an array with a single attribute path,
    the attribute will be interpreted as a Geo JSON location, so the first
    value of the array will be the longitude and the second will be the
    latitude for the document.

  If the type is `"fulltext"`, the object has the following additional properties:

  - **fields**: `Array<string>`

    An array containing exactly one attribute path.

  - **minLength**: `number` (optional)

    The minimum character length of words to index. Defaults to a
    server-defined value if omitted.

  If the type is `"ttl"`, the object has the following additional properties:

  - **fields**: `Array<string>`

    An array containing exactly one attribute path.

  - **expireAfter**: `number`

    Duration in seconds after the attribute value at which the document will
    be considered as expired.

**Examples**

```js
// Create a unique index for looking up by username
await collection.ensureIndex({
  type: "hash",
  fields: ["username"],
  name: "unique-usernames",
  unique: true
});
// Create an index for sorting email addresses
await collection.ensureIndex({
  type: "skiplist",
  fields: ["email"]
});
// Create an index for geo queries
await collection.ensureIndex({
  type: "geo",
  fields: ["lng", "lat"]
});
// Create a fulltext index for words longer than or equal to 3 characters
await collection.ensureIndex({
  type: "fulltext",
  fields: ["description"],
  minLength: 3
});
// Expire documents with "createdAt" timestamp one day after creation
await collection.ensureIndex({
  type: "ttl",
  fields: ["createdAt"],
  expireAfter: 60 * 60 * 24
});
// Expire documents with "expiresAt" timestamp according to attribute value
await collection.ensureIndex({
  type: "ttl",
  fields: ["expiresAt"],
  expireAfter: 0
});
```
