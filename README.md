[![Build status](https://img.shields.io/travis/arangodb/arangojs.svg)](https://travis-ci.org/arangodb/arangojs) [![Coverage Status](https://img.shields.io/coveralls/arangodb/arangojs.svg)](https://coveralls.io/r/arangodb/arangojs?branch=master) [![Codacy rating](https://img.shields.io/codacy/2a54ef7523e3446e9196f92e72ce1274.svg)](https://www.codacy.com/public/me_4/arangojs)

# Install

## With NPM

```sh
npm install arangojs
```

## Browser

This CommonJS module is compatible with browserify. If you don't want to use browserify, you can simply use the AMD-compatible [browserify bundle](https://raw.githubusercontent.com/arangodb/arangojs/master/dist/arango.min.js) (~42 kB minified, ~10 kB gzipped) which includes all required dependencies ([extend](https://npmjs.org/package/extend) and [xhr](https://npmjs.org/package/xhr)).

If you want to use this module in non-ES5 browsers like Microsoft Internet Explorer 8 and earlier, you need to include [es5-shim](https://www.npmjs.com/package/es5-shim) or a similar ES5 polyfill.

## From source

```sh
git clone https://github.com/arangodb/arangojs.git
cd arangojs
npm install
npm run dist
```

# API

All asynchronous functions take node-style callback functions with the following arguments:

* *err*: an *Error* object if an error occurred, or *null* if no error occurred.
* *result*: the function's result (if no error occurred).

If the server-side ArangoDB API returned an error, *err* will be an instance of *ArangoError*.

## Database API

### new Database([config])

Creates a new *database*.

*Parameter*
* *config* (optional): an object with the following properties:
 * *url* (optional): base URL of the ArangoDB server. Default: `http://localhost:8529`.
 * *databaseName* (optional): name of the active database. Default: `_system`.
 * *arangoVersion* (optional): value of the `x-arango-version` header. Default: `20200`.
 * *headers* (optional): an object with headers to send with every request.

If *config* is a string, it will be interpreted as *config.url*.

### Manipulating collections

#### database.createCollection(properties, callback)

Creates a collection from the given *properties*, then passes a new *Collection* instance to the callback.

If *properties* is a string, it will be interpreted as *properties.name*.

#### database.collection(collectionName, [autoCreate,] callback)

Fetches the collection with the given *collectionName* from the database, then passes a new *Collection* instance to the callback.

If *autoCreate* is set to `true`, a collection with the given name will be created if it doesn't already exist.

#### database.collections([excludeSystem,] callback)

Fetches all collections from the database and passes an array of new *Collection* instances to the callback.

If *excludeSystem* is set to `true`, system collections will not be included in the result.

#### database.dropCollection(collectionName, callback)

Deletes the collection with the given *collectionName* from the database.

#### database.truncate([excludeSystem,] callback)

Deletes **all documents** in **all collections** in the active database.

If *excludeSystem* is set to `true`, system collections will not be truncated.

### Manipulating graphs

#### database.createGraph(properties, callback)

Creates a graph with the given *properties*, then passes a new *Graph* instance to the callback.

#### database.graph(graphName, [autoCreate,], callback)

Fetches the graph with the given *graphName* from the database, then passes a new *Graph* instance to the callback.

If *autoCreate* is set to `true`, a graph with the given name will be created if it doesn't already exist.

#### database.graphs(callback)

Fetches all graphs from the database and passes an array of new *Graph* instances to the callback.

#### database.dropGraph(graphName, [dropCollections,] callback)

Deletes the graph with the given *graphName* from the database.

If *dropCollections* is set to `true`, the collections associated with the graphs will also be deleted.

### Manipulating databases

#### database.createDatabase(databaseName, callback)

Creates a new database with the given *databaseName*, then passes a new *Database* instance to the callback.

#### database.database(databaseName, [autoCreate,] callback)

Fetches the database with the given *databaseName* from the server, then passes a new *Database* instance to the callback.

If *autoCreate* is set to `true`, a database with the given name will be created if it doesn't already exist.

#### database.databases(callback)

Fetches all databases from the server and passes an array of new *Database* instances to the callback.

#### database.dropDatabase(databaseName, callback)

Deletes the database with the given *databaseName* from the server.

### Queries

#### database.query(query, [bindVars,] callback)

Performs a database query using the given *query* and *bindVars*, then passes a new *Cursor* instance for the result list to the callback.

*Parameter*

* *query*: an AQL query string or a [query builder](https://npmjs.org/package/aqb) instance.
* *bindVars* (optional): an object with the variables to bind the query to.

## Cursor API

*Cursor* instances provide an abstraction over the HTTP API's limitations. Unless a method explicitly exhausts the cursor, the driver will only fetch as many batches from the server as necessary. Unlike the server-side cursors, *Cursor* instances can also be rewinded.

### cursor.all(callback)

Rewinds and exhausts the cursor and passes an array containing all values returned by the query.

### cursor.next(callback)

Advances the cursor and passes the next value returned by the query. If the cursor has already been exhausted, passes `undefined` instead.

### cursor.hasNext():Boolean

Returns `true` if the cursor has more values or `false` if the cursor has been exhausted.

### cursor.each(fn, callback)

Rewinds and exhausts the cursor by applying the function *fn* to each value returned by the query, then invokes the callback with no result value.

Equivalent to *Array.prototype.forEach*.

### cursor.every(fn, callback)

Rewinds and advances the cursor by applying the function *fn* to each value returned by the query until the cursor is exhausted or *fn* returns a value that evaluates to `false`.

Passes the return value of the last call to *fn* to the callback.

Equivalent to *Array.prototype.every*.

### cursor.some(fn, callback)

Rewinds and advances the cursor by applying the function *fn* to each value returned by the query until the cursor is exhausted or *fn* returns a value that evaluates to `true`.

Passes the return value of the last call to *fn* to the callback.

Equivalent to *Array.prototype.some*.

### cursor.map(fn, callback)

Rewinds and exhausts the cursor by applying the function *fn* to each value returned by the query, then invokes the callback with an array of the return values.

Equivalent to *Array.prototype.map*.

### cursor.reduce(fn, [accu,] callback)

Rewinds and exhausts the cursor by reducing the values returned by the query with the given function *fn*. If *accu* is not provided, the first value returned by the query will be used instead (the function will not be invoked for that value).

Equivalent to *Array.prototype.reduce*.

### cursor.rewind()

Rewinds the cursor.

## Collection API

### Getting information about the collection

See [the HTTP API documentation](https://docs.arangodb.com/HttpCollection/Getting.html) for details.

#### collection.properties(callback)

Retrieves the collection's properties.

#### collection.count(callback)

Retrieves the number of documents in a collection.

#### collection.figures(callback)

Retrieves statistics for a collection.

#### collection.revision(callback)

Retrieves the collection revision ID.

#### collection.checksum([opts,] callback)

Retrieves the collection checksum.

### Manipulating the collection

#### collection.load([count,] callback)

Tells the server to load the collection into memory.

If *count* is set to `false`, the return value will not include the number of documents in the collection (which may speed up the process).

#### collection.unload(callback)

Tells the server to remove the collection from memory.

#### collection.setProperties(properties, callback)

Replaces the properties of the collection.

#### collection.rename(name, callback)

Renames the collection. The *Collection* instance will automatically update its name according to the server response.

#### collection.rotate(callback)

Rotates the journal of the collection.

#### collection.truncate(callback)

Deletes **all documents** in the collection in the database.

#### collection.drop(callback)

Deletes the collection from the database.

### Manipulating documents

#### collection.replace(documentHandle, data, [opts,] callback)

Replaces the content of the document with the given *documentHandle* with the given *data*.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until document has been synced to disk. Default: `false`.
* *rev*: Only replace the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection.

#### collection.update(documentHandle, data, [opts,] callback)

Updates (merges) the content of the document with the given *documentHandle* with the given *data*.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until document has been synced to disk. Default: `false`
* *keepNull*: If set to `false`, properties with a value of `null` indicate that a property should be deleted. Default: `true`.
* *mergeObjects*: If set to `false`, object properties that already exist in the old document will be overwritten rather than merged. This does not affect arrays. Default: `true`.
* *rev*: Only update the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection.

#### collection.remove(documentHandle, [opts,] callback)

Deletes the document with the given *documentHandle* from the collection.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until document has been synced to disk. Default: `false`
* *rev*: Only update the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection.

#### collection.all([type,] callback)

Retrieves a list of all documents in the collection.

If *type* is set to `"key"`, the result will be the `_key` of each document.

If *type* is set to `"path"`, the result will be the document URI paths.

If *type* is set to `"id"` or not set, the result will be the `_id` of each document.

### DocumentCollection API

Document collections extend the *Collection* API with the following methods.

#### documentCollection.document(documentHandle, callback)

Retrieves the document with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection.

#### documentCollection.save(data, callback)

Creates a new document with the given *data*.

### EdgeCollection API

Edge collections extend the *Collection* API with the following methods.

#### edgeCollection.edge(documentHandle, callback)

Retrieves the edge with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of an edge in the collection.

#### edgeCollection.save(data, fromId, toId, callback)

Creates a new edge between the documents *fromId* and *toId* with the given *data*.

#### edgeCollection.edges(documentHandle, callback)

Retrieves a list of all edges of the document with the given *documentHandle*.

#### edgeCollection.inEdges(documentHandle, callback)

Retrieves a list of all incoming edges of the document with the given *documentHandle*.

#### edgeCollection.outEdges(documentHandle, callback)

Retrieves a list of all outgoing edges of the document with the given *documentHandle*.

## Graph API

### graph.drop([dropCollections,] callback)

Deletes the graph from the database.

If *dropCollections* is set to `true`, the collections associated with the graph will also be deleted.

### Manipulating vertices

#### graph.vertexCollection(collectionName, callback)

Fetches the vertex collection with the given *collectionName* from the database, then passes a new *VertexCollection* instance to the callback.

#### graph.addVertexCollection(collectionName, callback)

Adds the collection with the given *collectionName* to the graph's vertex collections.

#### graph.removeVertexCollection(collectionName, [dropCollection,] callback)

Removes the vertex collection with the given *collectionName* from the graph.

If *dropCollection* is set to `true`, the collection will also be deleted from the database.

### Manipulating edges

#### graph.edgeCollection(collectionName, callback)

Fetches the edge collection with the given *collectionName* from the database, then passes a new *EdgeCollection* instance to the callback.

#### graph.addEdgeDefinition(definition, callback)

Adds the given edge definition *definition* to the graph.

#### graph.replaceEdgeDefinition(definitionName, definition, callback)

Replaces the edge definition named *definitionName* with the given *definition*.

#### graph.removeEdgeDefinition(definitionName, [dropCollection,] callback)

Removes the edge definition with the given *definitionName* form the graph.

If *dropCollection* is set to `true`, the edge collection associated with the definition will also be deleted from the database.

### VertexCollection API

Graph vertex collections extend the *Collection* API with the following methods.

#### vertexCollection.vertex(documentHandle, callback)

Retrieves the vertex with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of a vertex in the collection.

#### vertexCollection.save(data, callback)

Creates a new vertex with the given *data*.

### EdgeCollection API

Graph edge collections extend the *Collection* API with the following methods.

#### edgeCollection.edge(documentHandle, callback)

Retrieves the edge with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of an edge in the collection.

#### edgeCollection.save(data, fromId, toId, callback)

Creates a new edge between the vertices *fromId* and *toId* with the given *data*.

# License

The Apache License, Version 2.0. For more information, see the accompanying LICENSE file.