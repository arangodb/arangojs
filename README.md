# ArangoDB JavaScript driver

The official ArangoDB low-level JavaScript client for node.js and browsers.

[![license - APACHE-2.0](https://img.shields.io/npm/l/arangojs.svg)](http://opensource.org/licenses/APACHE-2.0) [![Dependencies](https://img.shields.io/david/arangodb/arangojs.svg)](https://david-dm.org/arangodb/arangojs)

[![NPM status](https://nodei.co/npm/arangojs.png?downloads=true&stars=true)](https://npmjs.org/package/arangojs)

[![Build status](https://img.shields.io/travis/arangodb/arangojs.svg)](https://travis-ci.org/arangodb/arangojs) [![Coverage Status](https://img.shields.io/coveralls/arangodb/arangojs.svg)](https://coveralls.io/r/arangodb/arangojs?branch=master) [![Codacy rating](https://img.shields.io/codacy/5fd86b5508cb4c559fd65e4c8059d800.svg)](https://www.codacy.com/public/me_4/arangojs_2)

# Install

## With NPM

```sh
npm install arangojs
```

## With Bower

```sh
bower install arangojs
```

## Browser

This CommonJS module is compatible with [browserify](http://browserify.org).

If you don't want to use browserify, you can simply use the AMD-compatible [browserify bundle](https://raw.githubusercontent.com/arangodb/arangojs/master/dist/arango.all.min.js) (~42 kB minified, ~10 kB gzipped) which includes all required dependencies ([extend](https://npmjs.org/package/extend) and [xhr](https://npmjs.org/package/xhr)).

There is also a [browserify bundle without the dependencies](https://raw.githubusercontent.com/arangodb/arangojs/master/dist/arango.min.js) (~34 kB minified, ~8 kB gzipped). In this case you need to provide modules named `request` (xhr) and `extend` yourself.

If you want to use this module in non-ES5 browsers like Microsoft Internet Explorer 8 and earlier, you need to include [es5-shim](https://www.npmjs.com/package/es5-shim) or a similar ES5 polyfill.

## From source

```sh
git clone https://github.com/arangodb/arangojs.git
cd arangojs
npm install
npm run dist
```

# API

All asynchronous functions take node-style callback functions (or "errbacks") with the following arguments:

* *err*: an *Error* object if an error occurred, or *null* if no error occurred.
* *result*: the function's result (if applicable).

For expected API errors, *err* will be an instance of *ArangoError*.

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

For more information on the *properties* object, see [the HTTP API documentation for creating collections](https://docs.arangodb.com/HttpCollection/Creating.html).

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

For more information on the *properties* object, see [the HTTP API documentation for creating graphs](https://docs.arangodb.com/HttpGharial/Management.html).

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

### Transactions

#### database.transaction(collections, action, [params,] [lockTimeout,] callback)

Performs a server-side transaction and passes the *action*'s return value to the callback.

*Parameter*

* *collections*: an object with the following properties:
 * *read*: an array of names (or a single name) of collections that will be read from during the transaction.
 * *write*: an array of names (or a single name) of collections that will be written to or read from during the transaction.
* *action*: a string evaluating to a JavaScript function to be executed on the server.
* *params* (optional): parameters that will be passed to the function.
* *lockTimeout* (optional): determines how long the database will wait while attemping to gain locks on collections used by the transaction before timing out.

If *collections* is an array or string, it will be used as *collections.write*.

Please note that while *action* should be a string evaluating to a well-formed JavaScript function, it's not possible to pass in a JavaScript function directly because the function needs to be evaluated on the server and will be transmitted in plain text.

For more information on transactions, see [the HTTP API documentation for transactions](https://docs.arangodb.com/HttpTransaction/README.html).

### Queries

#### database.query(query, [bindVars,] callback)

Performs a database query using the given *query* and *bindVars*, then passes a new *Cursor* instance for the result list to the callback.

*Parameter*

* *query*: an AQL query string or a [query builder](https://npmjs.org/package/aqb) instance.
* *bindVars* (optional): an object with the variables to bind the query to.

### Managing AQL user functions

#### database.createFunction(name, code, callback)

Creates an AQL user function with the given *name* and *code* if it does not already exist or replaces it if a function with the same name already existed.

*Paramter*

* *name*: a valid AQL function name, e.g.: `"myfuncs::accounting::calculate_vat"`.
* *code*: a string evaluating to a JavaScript function (not a JavaScript function object).

*Examples*

```js
var qb = require('aqb');
var db = require('arangojs')();
var vat_fn_name = 'myfuncs::acounting::calculate_vat';
var vat_fn_code = String(function (price) {
    return price * 0.19;
});
db.createFunction(vat_fn_name, vat_fn_code, function (err) {
    if (err) {
        console.error(err);
        return;
    }
    // Use the new function in an AQL query with the query builder:
    db.query(
        qb.for('product').in('products')
        .return(qb.MERGE(
            {
                vat: qb.fn(vat_fn_name)('product.price')
            },
            'product'
        )),
        function (err, result) {
            // ...
        }
    );
});
```

#### database.dropFunction(name[, group], callback)

Deletes the AQL user function with the given name from the database.

*Paramter*

* *name*: the name of the user function to drop.
* *group* (optional): if set to `true`, all functions with a name starting with *name* will be deleted; otherwise only the function with the exact name will be deleted. Default: `false`.

#### database.functions(callback)

Fetches a list of all AQL user functions registered with the database.

### Arbitrary HTTP endpoints

#### database.endpoint([path[, headers]])

Returns a new *Endpoint* instance for the given path (relative to the database) that can be used to perform arbitrary HTTP requests.

*Parameter*

* *path* (optional): relative URL of the endpoint.
* *headers* (optional): default headers that should be send with each request to the endpoint.

If *path* is missing, the endpoint will refer to the base URL of the database.

For more information on *Endpoint* instances see the *Endpoint API* below.

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

## Endpoint API

*Endpoint* instances provide access for arbitrary HTTP requests. This allows easy access to Foxx apps and other HTTP APIs not covered by the driver itself.

### endpoint.get([path,] [qs,] callback)

Performs a GET request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *qs* is an object, it will be translated to a query string.

### endpoint.post([path,] [body, [qs,]] callback)

Performs a POST request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

### endpoint.put([path,] [body, [qs,]] callback)

Performs a PUT request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

### endpoint.patch([path,] [body, [qs,]] callback)

Performs a PATCH request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

### endpoint.delete([path,] [qs,] callback)

Performs a DELETE request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *qs* is an object, it will be translated to a query string.

### endpoint.head([path,] [qs,] callback)

Performs a HEAD request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *qs* is an object, it will be translated to a query string.

### endpoint.request(opts, callback)

Performs an arbitrary request to the given URL and passes the server response to the given callback.

*Parameter*

* *opts*: an object with the following properties:
 * *path*: the endpoint-relative URL for the request.
 * *absolutePath* (optional): whether the *path* is relative to the connection's base URL instead of the database. Default: `false`.
 * *body* (optional): the request body.
 * *qs* (optional): the query string.
 * *headers* (optional): an object with additional HTTP headers to send with the request.
 * *method* (optional): HTTP method to use. Default: `"GET"`.

If *opts.path* is missing, the request will be made to the base URL of the endpoint.

If *opts.body* is an object, it will be converted to JSON.

If *opts.qs* is an object, it will be translated to a query string.

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

#### collection.import(data, [opts,] callback)

Bulk imports the given *data* into the collection.

The *data* can be an array of documents:

```js
[
  {key1: value1, key2: value2}, // document 1
  {key1: value1, key2: value2}, // document 2
  ...
]
```

Or it can be an array of value arrays following an array of keys.

```js
[
  ['key1', 'key2'], // key names
  [value1, value2], // document 1
  [value1, value2], // document 2
  ...
]
```

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until the documents have been synced to disk. Default: `false`.
* *details*: Whether the response should contain additional details about documents that could not be imported. Default: *false*.
* *type*: Indicates which format the data uses. Can be `"collection"`, `"array"` or `"auto"`. Default: `"auto"`.

For more information on the *opts* object, see [the HTTP API documentation for bulk imports](https://docs.arangodb.com/HttpBulkImports/ImportingSelfContained.html).

#### collection.replace(documentHandle, data, [opts,] callback)

Replaces the content of the document with the given *documentHandle* with the given *data*.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until the document has been synced to disk. Default: `false`.
* *rev*: Only replace the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection.

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

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

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

#### collection.remove(documentHandle, [opts,] callback)

Deletes the document with the given *documentHandle* from the collection.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until document has been synced to disk. Default: `false`
* *rev*: Only update the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection.

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

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

#### edgeCollection.traversal(startVertex, [opts,] callback)

Performs a traversal starting from the given *startVertex* and following edges contained in this edge collection.

See [the HTTP API documentation](https://docs.arangodb.com/HttpTraversal/README.html) for details on the additional arguments.

Please note that while *opts.filter*, *opts.visitor*, *opts.init*, *opts.expander* and *opts.sort* should be strings evaluating to well-formed JavaScript functions, it's not possible to pass in JavaScript functions directly because the functions need to be evaluated on the server and will be transmitted in plain text.

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

#### graph.traversal(startVertex, [opts,] callback)

Performs a traversal starting from the given *startVertex* and following edges contained in any of the edge collections of this graph.

See [the HTTP API documentation](https://docs.arangodb.com/HttpTraversal/README.html) for details on the additional arguments.

Please note that while *opts.filter*, *opts.visitor*, *opts.init*, *opts.expander* and *opts.sort* should be strings evaluating to well-formed JavaScript functions, it's not possible to pass in JavaScript functions directly because the functions need to be evaluated on the server and will be transmitted in plain text.

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
