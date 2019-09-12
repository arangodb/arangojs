# Collection API

These functions implement the
[HTTP API for manipulating collections](https://www.arangodb.com/docs/stable/http/collection.html).

The _Collection_ API is implemented by _DocumentCollection_ and _EdgeCollection_
instances. For the additional methods available on edge collections, see
[the _EdgeCollection_ API](EdgeCollection.md).

## Collection status

`enum CollectionStatus`

Integer values indicating the collection loading status.

- **NEWBORN**: `1`
- **UNLOADED**: `2`
- **LOADED**: `3`
- **UNLOADING**: `4`
- **DELETED**: `5`
- **LOADING**: `6`

## Collection type

`enum CollectionType`

Integer values indicating the collection type.

- **DOCUMENT_COLLECTION**: `2`
- **EDGE_COLLECTION**: `3`

```js
const db = new Database();
const collection = db.collection("some-collection");
const result = await collection.exists();
// result indicates whether the collection exists
```
