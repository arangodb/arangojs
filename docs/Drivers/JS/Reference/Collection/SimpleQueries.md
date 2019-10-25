# Simple queries

These functions implement the
[HTTP API for simple queries](https://www.arangodb.com/docs/stable/http/simple-query.html).

## collection.all

`async collection.all(options?): Cursor`

Performs a query to fetch all documents in the collection. Returns a
[new `Cursor` instance](../Cursor.md) for the query results.

**Arguments**

- **options**: `object` (optional)

  TODO
  [HTTP API for returning all documents](https://www.arangodb.com/docs/stable/http/simple-query.html#return-all-documents).

## collection.any

`async collection.any(): Document`

Fetches a document from the collection at random.

## collection.byExample

`async collection.byExample(example, options?): Cursor`

Performs a query to fetch all documents in the collection matching the given
_example_. Returns a [new `Cursor` instance](../Cursor.md) for the query results.

**Arguments**

- **example**: `object`

  An object representing an example for documents to be matched against.

- **options**: `object` (optional)

  TODO
  [HTTP API for fetching documents by example](https://www.arangodb.com/docs/stable/http/simple-query.html#find-documents-matching-an-example).

## collection.firstExample

`async collection.firstExample(example): Document`

Fetches the first document in the collection matching the given _example_.

**Arguments**

- **example**: `object`

  An object representing an example for documents to be matched against.

## collection.removeByExample

`async collection.removeByExample(example, options?): SimpleQueryRemoveByExampleResult`

Removes all documents in the collection matching the given _example_.

**Arguments**

- **example**: `object`

  An object representing an example for documents to be matched against.

- **options**: `object` (optional)

  TODO
  [HTTP API for removing documents by example](https://www.arangodb.com/docs/stable/http/simple-query.html#remove-documents-by-example).

Returns an object with the following property:

- **deleted**: `number`

  Number of documents removed by this query.

## collection.replaceByExample

`async collection.replaceByExample(example, newValue, options?): SimpleQueryReplaceByExampleResult`

Replaces all documents in the collection matching the given _example_ with the
given _newValue_.

**Arguments**

- **example**: `object`

  An object representing an example for documents to be matched against.

- **newValue**: `object`

  The new value to replace matching documents with.

- **options**: `object` (optional)

  TODO
  [HTTP API for replacing documents by example](https://www.arangodb.com/docs/stable/http/simple-query.html#replace-documents-by-example).

Returns an object with the following property:

- **replaced**: `number`

  Number of documents replaced by this query.

## collection.updateByExample

`async collection.updateByExample(example, newValue, options?): SimpleQueryUpdateByExampleResult`

Updates (patches) all documents in the collection matching the given _example_
with the given _newValue_.

**Arguments**

- **example**: `object`

  An object representing an example for documents to be matched against.

- **newValue**: `object`

  The new value to update matching documents with.

- **options**: `object` (optional)

  TODO
  [HTTP API for updating documents by example](https://www.arangodb.com/docs/stable/http/simple-query.html#update-documents-by-example).

Returns an object with the following property:

- **updated**: `number`

  Number of documents updated by this query.

## collection.lookupByKeys

`async collection.lookupByKeys(keys): Array<Document>`

Fetches the documents with the given _keys_ from the collection. Returns an
array of the matching documents.

**Arguments**

- **keys**: `Array<string>`

  An array of document keys to look up.

## collection.removeByKeys

`async collection.removeByKeys(keys, options?): Array<Document>`

Deletes the documents with the given _keys_ from the collection.

**Arguments**

- **keys**: `Array<string>`

  An array of document keys to delete.

- **options**: `object` (optional)

  TODO
  [HTTP API for removing documents by keys](https://www.arangodb.com/docs/stable/http/simple-query.html#remove-documents-by-their-keys).

## collection.fulltext

`async collection.fulltext(fieldName, query, options?): Cursor`

Performs a fulltext query in the given _fieldName_ on the collection.

**Arguments**

- **fieldName**: `string`

  Name of the field to search on documents in the collection.

- **query**: `string`

  Fulltext query string to search for.

- **options**: `object` (optional)

  TODO
  [HTTP API for fulltext queries](https://www.arangodb.com/docs/stable/http/indexes-fulltext.html).

## collection.list

`async collection.list(type?): Cursor<string>`

Retrieves a list of references for all documents in the collection.

**Arguments**

- **type**: `string` (Default: `"id"`)

  The format of the document references:

  - if _type_ is set to `"id"`, each reference will be the `_id` of the
    document.
  - if _type_ is set to `"key"`, each reference will be the `_key` of the
    document.
  - if _type_ is set to `"path"`, each reference will be the URI path of the
    document.
