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

These functions implement the [HTTP API for manipulating collections](https://docs.arangodb.com/HttpCollection/README.html).

#### database.createCollection(properties, callback)

Creates a collection from the given *properties*, then passes a new *Collection* instance to the callback.

For more information on the *properties* object, see [the HTTP API documentation for creating collections](https://docs.arangodb.com/HttpCollection/Creating.html).

If *properties* is a string, it will be interpreted as *properties.name*.

*Examples*

```js
var db = require('arangojs')();
db.createCollection('my-data', function (err, collection) {
    if (err) return console.error(err);
    // collection is a DocumentCollection instance
    // see the Collection API and DocumentCollection API below for details
});

// -- or --

db.createCollection({
    name: 'my-data',
    type: 2 // i.e. document collection (the default)
}, function (err, collection) {
    if (err) return console.error(err);
    // collection is a DocumentCollection instance
    // see the Collection API and DocumentCollection API below for details
});
```

#### database.createEdgeCollection(properties, callback)

Creates an edge collection from the given *properties*, then passes a new *EdgeCollection* instance to the callback.

For more information on the *properties* object, see [the HTTP API documentation for creating collections](https://docs.arangodb.com/HttpCollection/Creating.html).

If *properties* is a string, it will be interpreted as *properties.name*.

The collection type will be set to `3` (i.e. edge collection) regardless of the value of *properties.type*.

*Examples*

```js
var db = require('arangojs')();
db.createEdgeCollection('friends', function (err, edgeCollection) {
    if (err) return console.error(err);
    // edgeCollection is an EdgeCollection instance
    // see the Collection API and EdgeCollection API below for details
});
```

#### database.collection(collectionName, [autoCreate,] callback)

Fetches the collection with the given *collectionName* from the database, then passes a new *Collection* instance to the callback.

If *autoCreate* is set to `true`, a collection with the given name will be created if it doesn't already exist.

```js
var db = require('arangojs')();
db.collection('potatos', function (err, collection) {
    if (err) {
        // Collection did not exist
        console.error(err);
        return;
    }
    // collection exists
});
```

#### database.collections(callback)

Fetches all non-system collections from the database and passes an array of new *Collection* instances to the callback.

*Examples*

```js
var db = require('arangojs')();
db.collections(function (err, collections) {
    if (err) return console.error(err);
    // collections is an array of Collection instances
    // not including system collections
});
```

#### database.allCollections(callback)

Fetches all collections (including system collections) from the database and passes an array of new *Collection* instances to the callback.

*Examples*

```js
var db = require('arangojs')();
db.allCollections(function (err, collections) {
    if (err) return console.error(err);
    // collections is an array of Collection instances
    // including system collections
});
```

#### database.dropCollection(collectionName, callback)

Deletes the collection with the given *collectionName* from the database.

*Examples*

```js
var db = require('arangojs')();
db.dropCollection('friends', function (err) {
    if (err) return console.error(err);
    // collection "friends" no longer exists
});
```

#### database.truncate(callback)

Deletes **all documents** in **all non-system collections** in the active database.

*Examples*

```js
var db = require('arangojs')();
db.truncate(function (err) {
    if (err) return console.error(err);
    // all non-system collections in this database are now empty
});
```

#### database.truncateAll(callback)

Deletes **all documents** in **all collections (including system collections)** in the active database.

*Examples*

```js
var db = require('arangojs')();
db.truncateAll(function (err) {
    if (err) return console.error(err);
    // all collections (including system collections) in this db are now empty
    // "I've made a huge mistake..."
});
```

### Manipulating graphs

These functions implement the [HTTP API for manipulating general graphs](https://docs.arangodb.com/HttpGharial/README.html).

#### database.createGraph(properties, callback)

Creates a graph with the given *properties*, then passes a new *Graph* instance to the callback.

For more information on the *properties* object, see [the HTTP API documentation for creating graphs](https://docs.arangodb.com/HttpGharial/Management.html).

*Examples*

```js
var db = require('arangojs')();
// this assumes collections `edges`, `start-vertices` and `end-vertices` exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [
        {
            collection: 'edges',
            from: [
                'start-vertices'
            ],
            to: [
                'end-vertices'
            ]
        }
    ]
}, function (err, graph) {
    if (err) return console.error(err);
    // graph is a Graph instance
    // for more information see the Graph API below
});
```

#### database.graph(graphName, [autoCreate,], callback)

Fetches the graph with the given *graphName* from the database, then passes a new *Graph* instance to the callback.

If *autoCreate* is set to `true`, a graph with the given name will be created if it doesn't already exist.

*Examples*

```js
var db = require('arangojs')();
db.graph('some-graph', function (err, graph) {
    if (err) return console.error(err);
    // graph exists
});
```

#### database.graphs(callback)

Fetches all graphs from the database and passes an array of new *Graph* instances to the callback.

*Examples*

```js
var db = require('arangojs')();
db.graphs(function (err, graphs) {
    if (err) return console.error(err);
    // graphs is an array of Graph instances
});
```

#### database.dropGraph(graphName, [dropCollections,] callback)

Deletes the graph with the given *graphName* from the database.

If *dropCollections* is set to `true`, the collections associated with the graphs will also be deleted.

*Examples*

```js
var db = require('arangojs')();
db.dropGraph('some-graph', function (err) {
    if (err) return console.error(err);
    // graph "some-graph" no longer exists
});
```

### Manipulating databases

These functions implement the [HTTP API for manipulating databases](https://docs.arangodb.com/HttpDatabase/README.html).

#### database.createDatabase(databaseName, callback)

Creates a new database with the given *databaseName*, then passes a new *Database* instance to the callback.

*Examples*

```js
var db = require('arangojs')();
db.createDatabase('mydb', function (err, database) {
    if (err) return console.error(err);
    // database is a Database instance
});
```

#### database.database(databaseName, [autoCreate,] callback)

Fetches the database with the given *databaseName* from the server, then passes a new *Database* instance to the callback.

If *autoCreate* is set to `true`, a database with the given name will be created if it doesn't already exist.

*Examples*

```js
var db = require('arangojs')();
db.database('mydb', function (err, database) {
    if (err) return console.error(err);
    // mydb exists
});
```

#### database.databases(callback)

Fetches all databases from the server and passes an array of new *Database* instances to the callback.

*Examples*

```js
var db = require('arangojs')();
db.databases(function (err, databases) {
    if (err) return console.error(err);
    // databases is an array of Database instances
});
```

#### database.dropDatabase(databaseName, callback)

Deletes the database with the given *databaseName* from the server.

```js
var db = require('arangojs')();
db.dropDatabase('mydb', function (err) {
    if (err) return console.error(err);
    // database "mydb" no longer exists
})
```

### Transactions

This function implements the [HTTP API for transactions](https://docs.arangodb.com/HttpTransaction/README.html).

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

*Examples*

```js
var db = require('arangojs')();
var collections = {read: '_users'};
var action = String(function () {
    // This code will be executed inside ArangoDB!
    var db = require('org/arangodb').db;
    return db._query('FOR user IN _users RETURN u.user').toArray();
});
db.transaction(collections, action, function (err, result) {
    if (err) return console.error(err);
    // result contains the return value of the action
});
```

### Queries

This function implements the [HTTP API for AQL queries](https://docs.arangodb.com/HttpAqlQuery/README.html).

#### database.query(query, [bindVars,] callback)

Performs a database query using the given *query* and *bindVars*, then passes a new *Cursor* instance for the result list to the callback.

*Parameter*

* *query*: an AQL query string or a [query builder](https://npmjs.org/package/aqb) instance.
* *bindVars* (optional): an object with the variables to bind the query to.

For more information on *Cursor* instances see the [*Cursor API* below](#cursor-api).

*Examples*

```js
var qb = require('aqb');
var db = require('arangojs')();
db.query(
    qb.for('u').in('_users')
    .filter(qb.eq('u.authData.active', '@active'))
    .return('u.user'),
    {active: true},
    function (err, cursor) {
        if (err) return console.error(err);
        // cursor is a cursor for the query result
    }
);

// -- or --

db.query(
    'FOR u IN _users FILTER u.authData.active == @active RETURN u.user',
    {active: true},
    function (err, cursor) {
    if (err) return console.error(err);
        // cursor is a cursor for the query result
    }
);
```

### Managing AQL user functions

These functions implement the [HTTP API for managing AQL user functions](https://docs.arangodb.com/HttpAqlUserFunctions/README.html).

#### database.createFunction(name, code, callback)

Creates an AQL user function with the given *name* and *code* if it does not already exist or replaces it if a function with the same name already existed.

*Parameter*

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
    if (err) return console.error(err);
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

#### database.functions(callback)

Fetches a list of all AQL user functions registered with the database.

*Examples*

```js
var db = require('arangojs')();
db.functions(function (err, functions) {
    if (err) return console.error(err);
    // functions is a list of function definitions
})
```

#### database.dropFunction(name[, group], callback)

Deletes the AQL user function with the given name from the database.

*Parameter*

* *name*: the name of the user function to drop.
* *group* (optional): if set to `true`, all functions with a name starting with *name* will be deleted; otherwise only the function with the exact name will be deleted. Default: `false`.

*Examples*

```js
var db = require('arangojs')();
db.dropFunction('myfuncs::acounting::calculate_vat', function (err) {
    if (err) return console.error(err);
    // the function no longer exists
});
```

### Arbitrary HTTP endpoints

#### database.endpoint([path[, headers]])

Returns a new *Endpoint* instance for the given path (relative to the database) that can be used to perform arbitrary HTTP requests.

*Parameter*

* *path* (optional): relative URL of the endpoint.
* *headers* (optional): default headers that should be send with each request to the endpoint.

If *path* is missing, the endpoint will refer to the base URL of the database.

For more information on *Endpoint* instances see the [*Endpoint API* below](#endpoint-api).

*Examples*

```js
var db = require('arangojs')();
var myFoxxApp = db.endpoint('my-foxx-app');
myFoxxApp.post('users', {
    username: 'admin',
    password: 'hunter2'
}, function (err, result) {
    if (err) return console.error(err);
    // result is the result of
    // POST /_db/_system/my-foxx-app/users
    // with JSON request body '{"username": "admin", "password": "hunter2"}'
});
```

## Cursor API

*Cursor* instances provide an abstraction over the HTTP API's limitations. Unless a method explicitly exhausts the cursor, the driver will only fetch as many batches from the server as necessary. Unlike the server-side cursors, *Cursor* instances can also be rewinded.

```js
var db = require('arangojs')();
db.query(someQuery, function (err, cursor) {
    if (err) return console.error(err);
    // cursor represents the query results
});
```

### cursor.all(callback)

Rewinds and exhausts the cursor and passes an array containing all values returned by the query.

*Examples*

```js
// query result: [1, 2, 3, 4, 5]
cursor.all(function (err, vals) {
    if (err) return console.error(err);
    // vals is an array containing the entire query result
    vals.length === 5;
    vals; // [1, 2, 3, 4, 5]
    cursor.hasNext() === false;
});
```

### cursor.next(callback)

Advances the cursor and passes the next value returned by the query. If the cursor has already been exhausted, passes `undefined` instead.

*Examples*

```js
// query result: [1, 2, 3, 4, 5]
cursor.next(function (err, val) {
    if (err) return console.error(err);
    val === 1;
    cursor.next(function (err, val2) {
        if (err) return console.error(err);
        val2 === 2;
    });
});
```

### cursor.hasNext():Boolean

Returns `true` if the cursor has more values or `false` if the cursor has been exhausted. Synchronous.

*Examples*

```js
cursor.all(function (err) { // exhausts the cursor
    if (err) return console.error(err);
    cursor.hasNext() === false;
});
```

### cursor.each(fn, callback)

Rewinds and exhausts the cursor by applying the function *fn* to each value returned by the query, then invokes the callback with no result value.

Equivalent to *Array.prototype.forEach*.

```js
var counter = 0;
function count() {
    counter += 1;
    return counter;
}
// query result: [1, 2, 3, 4, 5]
cursor.each(count, function (err, result) {
    if (err) return console.error(err);
    counter === result;
    result === 5;
    cursor.hasNext() === false;
});
```

### cursor.every(fn, callback)

Rewinds and advances the cursor by applying the function *fn* to each value returned by the query until the cursor is exhausted or *fn* returns a value that evaluates to `false`.

Passes the return value of the last call to *fn* to the callback.

Equivalent to *Array.prototype.every*.

```js
function even(value) {
    return value % 2 === 0;
}
// query result: [0, 2, 4, 5, 6]
cursor.every(even, function (err, result) {
    if (err) return console.error(err);
    result === false; // 5 is not even
    cursor.hasNext() === true;
    cursor.next(function (err, value) {
        if (err) return console.error(err);
        value === 6; // next value after 5
    });
});
```

### cursor.some(fn, callback)

Rewinds and advances the cursor by applying the function *fn* to each value returned by the query until the cursor is exhausted or *fn* returns a value that evaluates to `true`.

Passes the return value of the last call to *fn* to the callback.

Equivalent to *Array.prototype.some*.

*Examples*

```js
function even(value) {
    return value % 2 === 0;
}
// query result: [1, 3, 4, 5]
cursor.some(even, function (err, result) {
    if (err) return console.error(err);
    result === true; // 4 is even
    cursor.hasNext() === true;
    cursor.next(function (err, value) {
        if (err) return console.error(err);
        value === 5; // next value after 4
    });
});
```

### cursor.map(fn, callback)

Rewinds and exhausts the cursor by applying the function *fn* to each value returned by the query, then invokes the callback with an array of the return values.

Equivalent to *Array.prototype.map*.

*Examples*

```js
function square(value) {
    return value * value;
}
// query result: [1, 2, 3, 4, 5]
cursor.map(square, function (err, result) {
    if (err) return console.error(err);
    result.length === 5;
    result; // [1, 4, 9, 16, 25]
    cursor.hasNext() === false;
});
```

### cursor.reduce(fn, [accu,] callback)

Rewinds and exhausts the cursor by reducing the values returned by the query with the given function *fn*. If *accu* is not provided, the first value returned by the query will be used instead (the function will not be invoked for that value).

Equivalent to *Array.prototype.reduce*.

*Examples*

```js
function add(a, b) {
    return a + b;
}
// query result: [1, 2, 3, 4, 5]

var baseline = 1000;
cursor.reduce(add, baseline, function (err, result) {
    if (err) return console.error(err);
    result === (baseline + 1 + 2 + 3 + 4 + 5);
    cursor.hasNext() === false;
});

// -- or --

cursor.reduce(add, function (err, result) {
    if (err) return console.error(err);
    result === (1 + 2 + 3 + 4 + 5);
    cursor.hasNext() === false;
});

```

### cursor.rewind()

Rewinds the cursor. Synchronous.

*Examples*

```js
// query result: [1, 2, 3, 4, 5]
cursor.all(function (err, result) {
    if (err) return console.error(err);
    result; // [1, 2, 3, 4, 5]
    cursor.hasNext() === false;
    cursor.rewind();
    cursor.hasNext() === true;
    cursor.next(function (err, value) {
        if (err) return console.error(err);
        value === 1;
    });
});
```

## Endpoint API

*Endpoint* instances provide access for arbitrary HTTP requests. This allows easy access to Foxx apps and other HTTP APIs not covered by the driver itself.

### endpoint.endpoint([path, [headers]])

Creates a new *Endpoint* instance representing the *path* relative to the current endpoint. Optionally *headers* can be an object with headers which will be extended with the current endpoint's headers and the connection's headers.

*Examples*

```js
var db = require('arangojs')();
var endpoint = db.endpoint('my-foxx-app');
var users = endpoint.endpoint('users');
// equivalent to db.endpoint('my-foxx-app/users')
```

### endpoint.get([path,] [qs,] callback)

Performs a GET request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *qs* is an object, it will be translated to a query string.

*Examples*

```js
var db = require('arangojs')();
var endpoint = db.endpoint('my-foxx-app');
endpoint.get(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // GET _db/_system/my-foxx-app
});

// -- or -- 

endpoint.get('users', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // GET _db/_system/my-foxx-app/users
});

// -- or --

endpoint.get('users', {group: 'admin'}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // GET _db/_system/my-foxx-app/users?group=admin
});
```

### endpoint.post([path,] [body, [qs,]] callback)

Performs a POST request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

*Examples*

```js
var db = require('arangojs')();
var endpoint = db.endpoint('my-foxx-app');
endpoint.post(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app
});

// -- or -- 

endpoint.post('users', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app/users
});

// -- or --

endpoint.post('users', {
    username: 'admin',
    password: 'hunter2'
}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app/users
    // with JSON request body {"username": "admin", "password": "hunter2"}
});

// -- or --

endpoint.post('users', {
    username: 'admin',
    password: 'hunter2'
}, {admin: true}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app/users?admin=true
    // with JSON request body {"username": "admin", "password": "hunter2"}
});
```

### endpoint.put([path,] [body, [qs,]] callback)

Performs a PUT request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

*Examples*

```js
var db = require('arangojs')();
var endpoint = db.endpoint('my-foxx-app');
endpoint.put(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PUT _db/_system/my-foxx-app
});

// -- or -- 

endpoint.put('users/admin', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PUT _db/_system/my-foxx-app/users
});

// -- or --

endpoint.put('users/admin', {
    username: 'admin',
    password: 'hunter2'
}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PUT _db/_system/my-foxx-app/users/admin
    // with JSON request body {"username": "admin", "password": "hunter2"}
});

// -- or --

endpoint.put('users/admin', {
    username: 'admin',
    password: 'hunter2'
}, {admin: true}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PUT _db/_system/my-foxx-app/users/admin?admin=true
    // with JSON request body {"username": "admin", "password": "hunter2"}
});
```

### endpoint.patch([path,] [body, [qs,]] callback)

Performs a PATCH request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

```js
var db = require('arangojs')();
var endpoint = db.endpoint('my-foxx-app');
endpoint.patch(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PATCH _db/_system/my-foxx-app
});

// -- or -- 

endpoint.patch('users/admin', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PATCH _db/_system/my-foxx-app/users
});

// -- or --

endpoint.patch('users/admin', {
    password: 'hunter2'
}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PATCH _db/_system/my-foxx-app/users/admin
    // with JSON request body {"password": "hunter2"}
});

// -- or --

endpoint.patch('users/admin', {
    password: 'hunter2'
}, {admin: true}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PATCH _db/_system/my-foxx-app/users/admin?admin=true
    // with JSON request body {"password": "hunter2"}
});
```

### endpoint.delete([path,] [qs,] callback)

Performs a DELETE request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *qs* is an object, it will be translated to a query string.

*Examples*

```js
var db = require('arangojs')();
var endpoint = db.endpoint('my-foxx-app');
endpoint.delete(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // DELETE _db/_system/my-foxx-app
});

// -- or -- 

endpoint.delete('users/admin', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // DELETE _db/_system/my-foxx-app/users/admin
});

// -- or --

endpoint.delete('users/admin', {permanent: true}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // DELETE _db/_system/my-foxx-app/users/admin?permanent=true
});
```

### endpoint.head([path,] [qs,] callback)

Performs a HEAD request to the given URL and passes the server response to the given callback.

*Parameter*

* *path* (optional): the endpoint-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the endpoint.

If *qs* is an object, it will be translated to a query string.

*Examples*

```js
var db = require('arangojs')();
var endpoint = db.endpoint('my-foxx-app');
endpoint.head(function (err, result, response) {
    if (err) return console.error(err);
    // result is empty (no response body)
    // response is the response object for
    // HEAD _db/_system/my-foxx-app
});
```

### endpoint.request(opts, callback)

Performs an arbitrary request to the given URL and passes the server response to the given callback.

*Parameter*

* *opts*: an object with the following properties:
 * *path*: the endpoint-relative URL for the request.
 * *absolutePath* (optional): whether the *path* is relative to the connection's base URL instead of the endpoint. Default: `false`.
 * *body* (optional): the request body.
 * *qs* (optional): the query string.
 * *headers* (optional): an object with additional HTTP headers to send with the request.
 * *method* (optional): HTTP method to use. Default: `"GET"`.

If *opts.path* is missing, the request will be made to the base URL of the endpoint.

If *opts.body* is an object, it will be converted to JSON.

If *opts.qs* is an object, it will be translated to a query string.

```js
var db = require('arangojs')();
var endpoint = db.endpoint('my-foxx-app');
endpoint.request({
    path: 'hello-world',
    method: 'POST',
    body: {hello: 'world'},
    qs: {admin: true}
}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app/hello-world?admin=true
    // with JSON request body '{"hello": "world"}'
});
```

## Collection API

These functions implement the [HTTP API for manipulating collections](https://docs.arangodb.com/HttpCollection/README.html).

The *Collection API* is implemented by all *Collection* instances, regardless of their specific type. I.e. it represents a shared subset between instances of [*DocumentCollection*](#documentcollection-api), [*EdgeCollection*](#edgecollection-api), [*GraphVertexCollection*](#graphvertexcollection-api) and [*GraphEdgeCollection*](#graphedgecollection-api).

### Getting information about the collection

See [the HTTP API documentation](https://docs.arangodb.com/HttpCollection/Getting.html) for details.

#### collection.properties(callback)

Retrieves the collection's properties.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.properties(function (err, props) {
        if (err) return console.error(err);
        // props contains the collection's properties
    });
});
```

#### collection.count(callback)

Retrieves the number of documents in a collection.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.count(function (err, count) {
        if (err) return console.error(err);
        // count contains the collection's count
    });
});
```

#### collection.figures(callback)

Retrieves statistics for a collection.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.figures(function (err, figures) {
        if (err) return console.error(err);
        // figures contains the collection's figures
    });
});
```

#### collection.revision(callback)

Retrieves the collection revision ID.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.revision(function (err, revision) {
        if (err) return console.error(err);
        // revision contains the collection's revision
    });
});
```

#### collection.checksum([opts,] callback)

Retrieves the collection checksum.

For information on the possible options see [the HTTP API for getting collection information](https://docs.arangodb.com/HttpCollection/Getting.html).

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.checksum(function (err, checksum) {
        if (err) return console.error(err);
        // checksum contains the collection's checksum
    });
});
```

### Manipulating the collection

These functions implement [the HTTP API for modifying collections](https://docs.arangodb.com/HttpCollection/Modifying.html).

#### collection.load([count,] callback)

Tells the server to load the collection into memory.

If *count* is set to `false`, the return value will not include the number of documents in the collection (which may speed up the process).

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.load(false, function (err) {
        if (err) return console.error(err);
        // the collection has now been loaded into memory
    });
});
```

#### collection.unload(callback)

Tells the server to remove the collection from memory.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.unload(function (err) {
        if (err) return console.error(err);
        // the collection has now been unloaded from memory
    });
});
```

#### collection.setProperties(properties, callback)

Replaces the properties of the collection.

For information on the *properties* argument see [the HTTP API for modifying collections](https://docs.arangodb.com/HttpCollection/Modifying.html).

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.setProperties({waitForSync: true}, function (err, result) {
        if (err) return console.error(err);
        result.waitForSync === true;
        // the collection will now wait for data being written to disk
        // whenever a document is changed
    });
});
```

#### collection.rename(name, callback)

Renames the collection. The *Collection* instance will automatically update its name according to the server response.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.rename('new-collection-name', function (err, result) {
        if (err) return console.error(err);
        result.name === 'new-collection-name';
        collection.name === result.name;
        // result contains additional information about the collection
    });
});
```

#### collection.rotate(callback)

Rotates the journal of the collection.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.rotate(function (err, result) {
        if (err) return console.error(err);
        // result.result will be true if rotation succeeded
    });
});
```

#### collection.truncate(callback)

Deletes **all documents** in the collection in the database.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.truncate(function (err) {
        if (err) return console.error(err);
        // the collection "some-collection" is now empty
    });
});
```

#### collection.drop(callback)

Deletes the collection from the database.

Equivalent to *database.dropCollection(collection.name, callback)*.

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.drop(function (err) {
        if (err) return console.error(err);
        // the collection "some-collection" no longer exists
    });
});
```

### Manipulating indexes

These functions implement the [HTTP API for manipulating indexes](https://docs.arangodb.com/HttpIndexes/README.html).

#### collection.createIndex(details, callback)

Creates an arbitrary index on the collection.

For information on the possible properties of the *details* object, see [the HTTP API for manipulating indexes](https://docs.arangodb.com/HttpIndexes/WorkingWith.html).

*Examples*

```js
var db = require('arangojs')();
var collection = db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createIndex({
        type: 'cap',
        size: 20
    }, function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        // the index has been created
    });
});
```

#### collection.createCapConstraint(size, callback)

Creates a cap constraint index on the collection.

*Parameter*

* *size*: an object with any of the following properties:
 * *size*: the maximum number of documents in the collection.
 * *byteSize*: the maximum size of active document data in the collection (in bytes).

If *size* is a number, it will be interpreted as *size.size*.

 For more information on the properties of the *size* object see [the HTTP API for creating cap constraints](https://docs.arangodb.com/HttpIndexes/Cap.html).

*Examples*

```js
var db = require('arangojs')();
db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createCapCollection(20, function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.size === 20;
        // the index has been created
    });
    // -- or --
    collection.createCapCollection({size: 20}, function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.size === 20;
        // the index has been created
    });
});
```

#### collection.createHashIndex(fields[, unique], callback)

Creates a hash index on the collection.

*Parameter*

* *fields*: an array of document fields on which to create the index.
* *unique* (optional): whether to constrain the fields to unique values. Default: `false`.

If *fields* is a string, it will be wrapped in an array automatically.

For more information on hash indexes, see [the HTTP API for hash indexes](https://docs.arangodb.com/HttpIndexes/Hash.html).

*Examples*

```js
var db = require('arangojs')();
db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createHashIndex('favorite-color', function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.fields; // ['favorite-color']
        // the index has been created
    });
    // -- or --
    collection.createHashIndex(['favorite-color'], function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.fields; // ['favorite-color']
        // the index has been created
    });
});
```

#### collection.createSkipList(fields[, unique], callback)

Creates a skiplist index on the collection.

*Parameter*

* *fields*: an array of document fields on which to create the index.
* *unique* (optional): whether to constrain the fields to unique values. Default: `false`.

If *fields* is a string, it will be wrapped in an array automatically.

For more information on skiplist indexes, see [the HTTP API for skiplist indexes](https://docs.arangodb.com/HttpIndexes/Skiplist.html).

*Examples*

```js
var db = require('arangojs')();
db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createSkipList('favorite-color', function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.fields; // ['favorite-color']
        // the index has been created
    });
    // -- or --
    collection.createSkipList(['favorite-color'], function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.fields; // ['favorite-color']
        // the index has been created
    });
});
```

#### collection.createGeoIndex(fields[, opts], callback)

Creates a geo-spatial index on the collection.

*Parameter*

* *fields*: an array of document fields on which to create the index. Currently, fulltext indexes must cover exactly one field.
* *opts* (optional): an object containing additional properties of the index.

If *fields* is a string, it will be wrapped in an array automatically.

For more information on the properties of the *opts* object see [the HTTP API for manipulating geo indexes](https://docs.arangodb.com/HttpIndexes/Geo.html).

*Examples*

```js
var db = require('arangojs')();
db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createGeoIndex(['longitude', 'latitude'], function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.fields; // ['longitude', 'latitude']
        // the index has been created
    });
    // -- or --
    collection.createGeoIndex('location', {geoJson: true}, function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.fields; // ['location']
        // the index has been created
    });
});
```

#### collection.createFulltextIndex(fields[, minLength], callback)

Creates a fulltext index on the collection.

*Parameter*

* *fields*: an array of document fields on which to create the index. Currently, fulltext indexes must cover exactly one field.
* *minLength* (optional): minimum character length of words to index. Uses a server-specific default value if not specified.

If *fields* is a string, it will be wrapped in an array automatically.

For more information on fulltext indexes, see [the HTTP API for fulltext indexes](https://docs.arangodb.com/HttpIndexes/Fulltext.html).

*Examples*

```js
var db = require('arangojs')();
db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createFulltextIndex('description', function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.fields; // ['description']
        // the index has been created
    });
    // -- or --
    collection.createFulltextIndex(['description'], function (err, index) {
        if (err) return console.error(err);
        index.id; // the index's handle
        index.fields; // ['description']
        // the index has been created
    });
});
```

#### collection.index(indexHandle, callback)

Fetches information about the index with the given *indexHandle* and passes it to the given callback.

The value of *indexHandle* can either be a fully-qualified *index.id* or the collection-specific key of the index.

*Examples*

```js
var db = require('arangojs')();
db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createFulltextIndex('description', function (err, index) {
        if (err) return console.error(err);
        collection.index(index.id, function (err, result) {
            if (err) return console.error(err);
            result.id === index.id;
            // result contains the properties of the index
        });
        // -- or --
        collection.index(index.id.split('/')[1], function (err, result) {
            if (err) return console.error(err);
            result.id === index.id;
            // result contains the properties of the index
        });
    });
});
```

#### collection.indexes(callback)

Fetches a list of all indexes on this collection.

*Examples*

```js
var db = require('arangojs')();
db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createFulltextIndex('description', function (err) {
        if (err) return console.error(err);
        collection.indexes(function (err, indexes) {
            if (err) return console.error(err);
            indexes.length === 1;
            // indexes contains information about the index
        });
    });
});
```

#### collection.dropIndex(indexHandle, callback)

Deletes the index with the given *indexHandle* from the collection.

The value of *indexHandle* can either be a fully-qualified *index.id* or the collection-specific key of the index.

*Examples*

```js
var db = require('arangojs')();
db.createCollection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createFulltextIndex('description', function (err, index) {
        if (err) return console.error(err);
        collection.dropIndex(index.id, function (err) {
            if (err) return console.error(err);
            // the index has been removed from the collection
        });
        // -- or --
        collection.dropIndex(index.id.split('/')[1], function (err) {
            if (err) return console.error(err);
            // the index has been removed from the collection
        });
    });
});
```

### Fulltext queries

This function implements the [HTTP API for fulltext queries](https://docs.arangodb.com/HttpIndexes/Fulltext.html).

Note that a collection must have fulltext indexes in order to perform fulltext queries on it.

#### collection.fulltext(fieldName, query, [opts,] callback)

Performs a fulltext query searching for *query* in the given *fieldName* of all documents in this collection.

*Parameter*

* *fieldName*: the name of the field to search.
* *query*: a fulltext query string.
* *opts* (optional): an object additional options for the query.

For more information on the properties of the *opts* object see [the HTTP API for fulltext queries](https://docs.arangodb.com/HttpIndexes/Fulltext.html).

For more information on *Cursor* instances see the [*Cursor API* below](#cursor-api).

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createFulltextIndex('description', function (err) {
        if (err) return console.error(err);
        collection.fulltext('description', 'hello', function (err, cursor) {
            if (err) return console.error(err);
            // cursor is a Cursor instance for the query results
        });
    });
});
```

### Bulk importing documents

This function implements the [HTTP API for bulk imports](https://docs.arangodb.com/HttpBulkImports/README.html).

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
* *type*: Indicates which format the data uses. Can be `"documents"`, `"array"` or `"auto"`. Default: `"auto"`.

If *data* is a JavaScript array, it will be transmitted as a line-delimited JSON stream. If *opts.type* is set to `"array"`, it will be transmitted as regular JSON instead. If *data* is a string, it will be transmitted as it is without any processing.

For more information on the *opts* object, see [the HTTP API documentation for bulk imports](https://docs.arangodb.com/HttpBulkImports/ImportingSelfContained.html).

*Examples*

```js
var db = require('arangojs')();
db.collection('users', function (err, collection) {
    if (err) return console.error(err);
    collection.import(
        [// document stream
            {username: 'admin', password: 'hunter2', 'favorite-color': 'orange'},
            {username: 'jcd', password: 'bionicman', 'favorite-color': 'black'},
            {username: 'jreyes', password: 'amigo', 'favorite-color': 'white'},
            {username: 'ghermann', password: 'zeitgeist', 'favorite-color': 'blue'}
        ],
        function (err, result) {
            if (err) return console.error(err);
            result.created === 4;
        }
    );
    // -- or --
    collection.import(
        [// array stream with header
            ['username', 'password', 'favourite_color'],
            ['admin', 'hunter2', 'orange'],
            ['jcd', 'bionicman', 'black'],
            ['jreyes', 'amigo', 'white'],
            ['ghermann', 'zeitgeist', 'blue']
        ],
        function (err, result) {
            if (err) return console.error(err);
            result.created === 4;
        }
    );
    // -- or --
    collection.import(
        (// raw line-delimited JSON array stream with header
            '["username", "password", "favourite_color"]\r\n' +
            '["admin", "hunter2", "orange"]\r\n' +
            '["jcd", "bionicman", "black"]\r\n' +
            '["jreyes", "amigo", "white"]\r\n' +
            '["ghermann", "zeitgeist", "blue"]\r\n'
        ),
        function (err, result) {
            if (err) return console.error(err);
            result.created === 4;
        }
    );
});
```

### Manipulating documents

These functions implement the [HTTP API for manipulating documents](https://docs.arangodb.com/HttpDocument/README.html).

#### collection.replace(documentHandle, data, [opts,] callback)

Replaces the content of the document with the given *documentHandle* with the given *data*.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until the document has been synced to disk. Default: `false`.
* *rev*: Only replace the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.save({number: 1, hello: 'world'}, function (err, doc) {
        if (err) return console.error(err);
        collection.replace(doc, {number: 2}, function (err, doc2) {
            if (err) return console.error(err);
            doc2._id === doc._id;
            doc2._rev !== doc._rev;
            doc2.number === 2;
            doc2.hello === undefined;
        });
    });
});
```

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

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.save({number: 1, hello: 'world'}, function (err, doc) {
        if (err) return console.error(err);
        collection.update(doc, {number: 2}, function (err, doc2) {
            if (err) return console.error(err);
            doc2._id === doc._id;
            doc2._rev !== doc._rev;
            doc2.number === 2;
            doc2.hello === doc.hello;
        });
    });
});
```

#### collection.remove(documentHandle, [opts,] callback)

Deletes the document with the given *documentHandle* from the collection.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until document has been synced to disk. Default: `false`
* *rev*: Only update the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

*Examples*

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.remove('some-doc', function (err) {
        if (err) return console.error(err);
        // document 'some-collection/some-doc' no longer exists
    });
    // -- or --
    collection.remove('some-collection/some-doc', function (err) {
        if (err) return console.error(err);
        // document 'some-collection/some-doc' no longer exists
    });
});
```

#### collection.all([type,] callback)

Retrieves a list of all documents in the collection.

If *type* is set to `"key"`, the result will be the `_key` of each document.

If *type* is set to `"path"`, the result will be the document URI paths.

If *type* is set to `"id"` or not set, the result will be the `_id` of each document.

### DocumentCollection API

The *DocumentCollection API* extends the [*Collection API* (see above)](#collection-api) with the following methods.

#### documentCollection.document(documentHandle, callback)

Retrieves the document with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

*Examples*

```js
var db = require('arangojs')();
// assumes a document collection "my-docs" already exists
db.collection('my-docs', function (err, collection) {
    if (err) return console.error(err);
    collection.document('some-key', function (err, doc) {
        if (err) return console.error(err);
        // the document exists
        doc._key === 'some-key';
        doc._id === 'my-docs/some-key';
    });
    // -- or --
    collection.document('my-docs/some-key', function (err, doc) {
        if (err) return console.error(err);
        // the document exists
        doc._key === 'some-key';
        doc._id === 'my-docs/some-key';
    });
});
```

#### documentCollection.save(data, callback)

Creates a new document with the given *data*.

*Examples*

```js
var db = require('arangojs')();
db.createCollection('my-docs', function (err, collection) {
    if (err) return console.error(err);
    collection.save(
        {some: 'data'},
        function (err, doc) {
            if (err) return console.error(err);
            doc._key; // the document's key
            doc._id === ('my-docs/' + doc._key);
            doc.some === 'data';
        }
    );
});
```

### EdgeCollection API

The *EdgeCollection API* extends the [*Collection API* (see above)](#collection-api) with the following methods.

#### edgeCollection.edge(documentHandle, callback)

Retrieves the edge with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of an edge in the collection, or an edge (i.e. an object with an `_id` or `_key` property).

*Examples*

```js
var db = require('arangojs')();
// assumes an edge collection "edges" already exists
db.collection('edges', function (err, collection) {
    if (err) return console.error(err);
    collection.edge('some-key', function (err, edge) {
        if (err) return console.error(err);
        // the edge exists
        edge._key === 'some-key';
        edge._id === 'edges/some-key';
    });
    // -- or --
    collection.edge('edges/some-key', function (err, edge) {
        if (err) return console.error(err);
        // the edge exists
        edge._key === 'some-key';
        edge._id === 'edges/some-key';
    });
});
```

#### edgeCollection.save(data, fromId, toId, callback)

Creates a new edge between the documents *fromId* and *toId* with the given *data*.

*Examples*

```js
var db = require('arangojs')();
// assumes a collection "vertices" already exists
db.createEdgeCollection('edges', function (err, collection) {
    if (err) return console.error(err);
    collection.save(
        {some: 'data'},
        'vertices/start-vertex',
        'vertices/end-vertex',
        function (err, edge) {
            if (err) return console.error(err);
            edge._key; // the edge's key
            edge._id === ('edges/' + edge._key);
            edge.some === 'data';
            edge._from === 'vertices/start-vertex';
            edge._to === 'vertices/end-vertex';
        }
    );
});
```

#### edgeCollection.edges(documentHandle, callback)

Retrieves a list of all edges of the document with the given *documentHandle*.

The *documentHandle* can be either the `_id` or the `_key` of a document in any collection, or a document (i.e. an object with an `_id` or `_key` property).

*Examples*

```js
var db = require('arangojs')();
// assumes a collection "vertices" already exists
db.createEdgeCollection('edges', function (err, collection) {
    if (err) return console.error(err);
    collection.import([
        ['_key', '_from', '_to'],
        ['x', 'vertices/a', 'vertices/b'],
        ['y', 'vertices/a', 'vertices/c'],
        ['z', 'vertices/d', 'vertices/a']
    ], function (err) {
        if (err) return console.error(err);
        collection.edges('vertices/a', function (err, edges) {
            if (err) return console.error(err);
            edges.length === 3;
            edges.map(function (edge) {return edge._key;}); // ['x', 'y', 'z']
        });
    });
});
```

#### edgeCollection.inEdges(documentHandle, callback)

Retrieves a list of all incoming edges of the document with the given *documentHandle*.

The *documentHandle* can be either the `_id` or the `_key` of a document in any collection, or a document (i.e. an object with an `_id` or `_key` property).

*Examples*

```js
var db = require('arangojs')();
// assumes a collection "vertices" already exists
db.createEdgeCollection('edges', function (err, collection) {
    if (err) return console.error(err);
    collection.import([
        ['_key', '_from', '_to'],
        ['x', 'vertices/a', 'vertices/b'],
        ['y', 'vertices/a', 'vertices/c'],
        ['z', 'vertices/d', 'vertices/a']
    ], function (err) {
        if (err) return console.error(err);
        collection.inEdges('vertices/a', function (err, edges) {
            if (err) return console.error(err);
            edges.length === 1;
            edges[0]._key === 'z';
        });
    });
});
```

#### edgeCollection.outEdges(documentHandle, callback)

Retrieves a list of all outgoing edges of the document with the given *documentHandle*.

The *documentHandle* can be either the `_id` or the `_key` of a document in any collection, or a document (i.e. an object with an `_id` or `_key` property).

*Examples*

```js
var db = require('arangojs')();
// assumes a collection "vertices" already exists
db.createEdgeCollection('edges', function (err, collection) {
    if (err) return console.error(err);
    collection.import([
        ['_key', '_from', '_to'],
        ['x', 'vertices/a', 'vertices/b'],
        ['y', 'vertices/a', 'vertices/c'],
        ['z', 'vertices/d', 'vertices/a']
    ], function (err) {
        if (err) return console.error(err);
        collection.outEdges('vertices/a', function (err, edges) {
            if (err) return console.error(err);
            edges.length === 2;
            edges.map(function (edge) {return edge._key;}); // ['x', 'y']
        });
    });
});
```

#### edgeCollection.traversal(startVertex, [opts,] callback)

Performs a traversal starting from the given *startVertex* and following edges contained in this edge collection.

See [the HTTP API documentation](https://docs.arangodb.com/HttpTraversal/README.html) for details on the additional arguments.

Please note that while *opts.filter*, *opts.visitor*, *opts.init*, *opts.expander* and *opts.sort* should be strings evaluating to well-formed JavaScript code, it's not possible to pass in JavaScript functions directly because the code needs to be evaluated on the server and will be transmitted in plain text.

*Examples*

```js
var db = require('arangojs')();
// assumes a collection "vertices" already exists
db.createEdgeCollection('edges', function (err, collection) {
    if (err) return console.error(err);
    collection.import([
        ['_key', '_from', '_to'],
        ['x', 'vertices/a', 'vertices/b'],
        ['y', 'vertices/b', 'vertices/c'],
        ['z', 'vertices/c', 'vertices/d']
    ], function (err) {
        if (err) return console.error(err);
        collection.traversal('vertices/a', {
            direction: 'outbound',
            visitor: 'result.vertices.push(vertex._key);',
            init: 'result.vertices = [];'
        }, function (err, result) {
            if (err) return console.error(err);
            result.vertices; // ['a', 'b', 'c', 'd']
        });
    });
});
```

## Graph API

These functions implement the [HTTP API for manipulating graphs](https://docs.arangodb.com/HttpGharial/README.html).

### graph.drop([dropCollections,] callback)

Deletes the graph from the database.

If *dropCollections* is set to `true`, the collections associated with the graph will also be deleted.

Equivalent to *database.dropGraph(graph.name, callback)*.

*Examples*

```js
var db = require('arangojs')();
db.graph('some-graph', function (err, graph) {
    if (err) return console.error(err);
    graph.drop(function (err) {
        if (err) return console.error(err);
        // the graph "some-graph" no longer exists
    });
});
```

### Manipulating vertices

#### graph.vertexCollection(collectionName, callback)

Fetches the vertex collection with the given *collectionName* from the database, then passes a new [*GraphVertexCollection* instance](#graphvertexcollection-api) to the callback.

*Examples*

```js
var db = require('arangojs')();
// assuming the collections "edges" and "vertices" exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.vertexCollection('vertices', function (err, collection) {
        if (err) return console.error(err);
        collection.name === 'vertices';
        // collection is a GraphVertexCollection
    });
});
```

#### graph.addVertexCollection(collectionName, callback)

Adds the collection with the given *collectionName* to the graph's vertex collections.

*Examples*

```js
var db = require('arangojs')();
// assuming the collection "vertices" exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: []
}, function (err, graph) {
    if (err) return console.error(err);
    graph.addVertexCollection('vertices', function (err) {
        if (err) return console.error(err);
        // the collection "vertices" has been added to the graph
    });
});
```

#### graph.removeVertexCollection(collectionName, [dropCollection,] callback)

Removes the vertex collection with the given *collectionName* from the graph.

If *dropCollection* is set to `true`, the collection will also be deleted from the database.

*Examples*

```js
var db = require('arangojs')();
// assuming the collections "edges" and "vertices" exist
db.createGraph({
    name: 'some-graph',
    orphanCollections: ['vertices']
}, function (err, graph) {
    if (err) return console.error(err);
    graph.removeVertexCollection('vertices', function (err) {
        if (err) return console.error(err);
        // collection "vertices" has been removed from the graph
    });
    // -- or --
    graph.removeVertexCollection('vertices', true, function (err) {
        if (err) return console.error(err);
        // collection "vertices" has been removed from the graph
        // the collection has also been dropped from the database
        // this may have been a bad idea
    });
});
```

### Manipulating edges

#### graph.edgeCollection(collectionName, callback)

Fetches the edge collection with the given *collectionName* from the database, then passes a new [*GraphEdgeCollection* instance](#graphedgecollection-api) to the callback.

*Examples*

```js
var db = require('arangojs')();
// assuming the collections "edges" and "vertices" exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.edgeCollection('edges', function (err, collection) {
        if (err) return console.error(err);
        collection.name === 'edges';
        // collection is a GraphEdgeCollection
    });
});
```

#### graph.addEdgeDefinition(definition, callback)

Adds the given edge definition *definition* to the graph.

For more information on edge definitions see [the HTTP API for managing graphs](https://docs.arangodb.com/HttpGharial/Management.html).

*Examples*

```js
var db = require('arangojs')();
// assuming the collections "edges" and "vertices" exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: []
}, function (err, graph) {
    if (err) return console.error(err);
    graph.addEdgeDefinition({
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }, function (err) {
        if (err) return console.error(err);
        // the edge definition has been added to the graph
    });
});
```

#### graph.replaceEdgeDefinition(collectionName, definition, callback)

Replaces the edge definition for the edge collection named *collectionName* with the given *definition*.

For more information on edge definitions see [the HTTP API for managing graphs](https://docs.arangodb.com/HttpGharial/Management.html).

*Examples*

```js
var db = require('arangojs')();
// assuming the collections "edges", "vertices" and "more-vertices" exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.replaceEdgeDefinition('edges', {
        collection: 'edges',
        from: ['vertices'],
        to: ['more-vertices']
    }, function (err) {
        if (err) return console.error(err);
        // the edge definition has been modified
    });
});
```

#### graph.removeEdgeDefinition(definitionName, [dropCollection,] callback)

Removes the edge definition with the given *definitionName* form the graph.

If *dropCollection* is set to `true`, the edge collection associated with the definition will also be deleted from the database.

For more information on edge definitions see [the HTTP API for managing graphs](https://docs.arangodb.com/HttpGharial/Management.html).

*Examples*

```js
var db = require('arangojs')();
// assuming the collections "edges" and "vertices" exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.removeEdgeDefinition('edges', function (err) {
        if (err) return console.error(err);
        // the edge definition has been removed
    });
    // -- or --
    graph.removeEdgeDefinition('edges', true, function (err) {
        if (err) return console.error(err);
        // the edge definition has been removed
        // and the edge collection "edges" has been dropped
        // this may have been a bad idea
    });
});
```

#### graph.traversal(startVertex, [opts,] callback)

Performs a traversal starting from the given *startVertex* and following edges contained in any of the edge collections of this graph.

See [the HTTP API documentation](https://docs.arangodb.com/HttpTraversal/README.html) for details on the additional arguments.

Please note that while *opts.filter*, *opts.visitor*, *opts.init*, *opts.expander* and *opts.sort* should be strings evaluating to well-formed JavaScript functions, it's not possible to pass in JavaScript functions directly because the functions need to be evaluated on the server and will be transmitted in plain text.

*Examples*

```js
var db = require('arangojs')();
// assumes the collections "edges" and "vertices" already exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.edgeCollection('edges', function (err, collection) {
        if (err) return console.error(err);
        collection.import([
            ['_key', '_from', '_to'],
            ['x', 'vertices/a', 'vertices/b'],
            ['y', 'vertices/b', 'vertices/c'],
            ['z', 'vertices/c', 'vertices/d']
        ], function (err) {
            if (err) return console.error(err);
            graph.traversal('vertices/a', {
                direction: 'outbound',
                visitor: 'result.vertices.push(vertex._key);',
                init: 'result.vertices = [];'
            }, function (err, result) {
                if (err) return console.error(err);
                result.vertices; // ['a', 'b', 'c', 'd']
            });
        });
    });
});
```

### GraphVertexCollection API

The *GraphVertexCollection API* extends the [*Collection API* (see above)](#collection-api) with the following methods.

#### graphVertexCollection.vertex(documentHandle, callback)

Retrieves the vertex with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of a vertex in the collection, or a vertex (i.e. an object with an `_id` or `_key` property).

*Examples*

```js
// assumes the collections "edges" and "vertices" already exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.vertexCollection('vertices', function (err, collection) {
        if (err) return console.error(err);
        collection.vertex('some-key', function (err, doc) {
            if (err) return console.error(err);
            // the vertex exists
            doc._key === 'some-key';
            doc._id === 'vertices/some-key';
        });
        // -- or --
        collection.vertex('vertices/some-key', function (err, doc) {
            if (err) return console.error(err);
            // the vertex exists
            doc._key === 'some-key';
            doc._id === 'vertices/some-key';
        });
    });
});
```

#### graphVertexCollection.save(data, callback)

Creates a new vertex with the given *data*.

*Examples*

```js
var db = require('arangojs')();
// assumes the collections "edges" and "vertices" already exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.vertexCollection('vertices', function (err, collection) {
        if (err) return console.error(err);
        collection.save(
            {some: 'data'},
            function (err, doc) {
                if (err) return console.error(err);
                doc._key; // the document's key
                doc._id === ('vertices/' + doc._key);
                doc.some === 'data';
            }
        );
    });
});
```

### GraphEdgeCollection API

The *GraphEdgeCollection API* extends the *Collection API* (see above) with the following methods.

#### graphEdgeCollection.edge(documentHandle, callback)

Retrieves the edge with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of an edge in the collection, or an edge (i.e. an object with an `_id` or `_key` property).

```js
// assumes the collections "edges" and "vertices" already exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.edgeCollection('edges', function (err, collection) {
        if (err) return console.error(err);
        collection.edge('some-key', function (err, edge) {
            if (err) return console.error(err);
            // the edge exists
            edge._key === 'some-key';
            edge._id === 'edges/some-key';
        });
        // -- or --
        collection.edge('edges/some-key', function (err, edge) {
            if (err) return console.error(err);
            // the edge exists
            edge._key === 'some-key';
            edge._id === 'edges/some-key';
        });
    });
});
```

#### graphEdgeCollection.save(data, fromId, toId, callback)

Creates a new edge between the vertices *fromId* and *toId* with the given *data*.

*Examples*

```js
var db = require('arangojs')();
// assumes the collections "edges" and "vertices" already exist
db.createGraph({
    name: 'some-graph',
    edgeDefinitions: [{
        collection: 'edges',
        from: ['vertices'],
        to: ['vertices']
    }]
}, function (err, graph) {
    if (err) return console.error(err);
    graph.edgeCollection('edges', function (err, collection) {
        if (err) return console.error(err);
        collection.save(
            {some: 'data'},
            'vertices/start-vertex',
            'vertices/end-vertex',
            function (err, edge) {
                if (err) return console.error(err);
                edge._key; // the edge's key
                edge._id === ('edges/' + edge._key);
                edge.some === 'data';
                edge._from === 'vertices/start-vertex';
                edge._to === 'vertices/end-vertex';
            }
        );
    });
});
```

# License

The Apache License, Version 2.0. For more information, see the accompanying LICENSE file.
