# ArangoDB JavaScript driver

The official ArangoDB low-level JavaScript clients.

[![license - APACHE-2.0](https://img.shields.io/npm/l/arangojs.svg)](http://opensource.org/licenses/APACHE-2.0) [![Dependencies](https://img.shields.io/david/arangodb/arangojs.svg)](https://david-dm.org/arangodb/arangojs)

[![NPM status](https://nodei.co/npm/arangojs.png?downloads=true&stars=true)](https://npmjs.org/package/arangojs)

[![Build status](https://img.shields.io/travis/arangodb/arangojs.svg)](https://travis-ci.org/arangodb/arangojs) [![Coverage Status](https://img.shields.io/coveralls/arangodb/arangojs.svg)](https://coveralls.io/r/arangodb/arangojs?branch=master) [![Codacy rating](https://img.shields.io/codacy/5fd86b5508cb4c559fd65e4c8059d800.svg)](https://www.codacy.com/public/me_4/arangojs_2)

# Install

## With NPM

```sh
npm install arangojs
```

<!--
## With Bower

```sh
bower install arangojs
```

## Browser

This CommonJS module is compatible with [browserify](http://browserify.org).

If you don't want to use browserify, you can simply use the AMD-compatible [browserify bundle](https://raw.githubusercontent.com/arangodb/arangojs/master/dist/arango.all.min.js) which includes all required dependencies.

There is also a [browserify bundle without the dependencies](https://raw.githubusercontent.com/arangodb/arangojs/master/dist/arango.min.js). In this case you need to provide modules named `request` (xhr) and `extend` yourself.

If you want to use this module in non-ES5 browsers like Microsoft Internet Explorer 8 and earlier, you need to include [es5-shim](https://www.npmjs.com/package/es5-shim) or a similar ES5 polyfill.
-->

## From source

```sh
git clone https://github.com/arangodb/arangojs.git
cd arangojs
npm install
npm run dist
```

# API

All asynchronous functions take an optional node-style callback (or "errback") with the following arguments:

* *err*: an *Error* object if an error occurred, or *null* if no error occurred.
* *result*: the function's result (if applicable).

For expected API errors, *err* will be an instance of *ArangoError*.

If `Promise` is defined globally, asynchronous functions also return a promise. When using both node-style callbacks and promises, the node-style callback will be invoked before the promise's fulfillment/rejection handlers.

If you want to use promises in environments that don't provide the global `Promise` constructor, use a promise polyfill like [es6-promise](https://www.npmjs.com/package/es6-promise) or inject a ES6-compatible promise implementation like [bluebird](https://www.npmjs.com/package/bluebird) into the global scope.

## Database API

### new Database

`new Database([config]): Database`

Creates a new *Database* instance.

If *config* is a string, it will be interpreted as *config.url*.

**Arguments**

* **config**: *Object* (optional)

  An object with the following properties:

  * **url**: *string* (Default: `http://localhost:8529`)

    Base URL of the ArangoDB server.

    If you want to use ArangoDB with HTTP Basic authentication, you can provide the credentials as part of the URL, e.g. `http://user:pass@localhost:8529`.

    The driver automatically uses HTTPS if you specify an HTTPS *url*.

    If you need to support self-signed HTTPS certificates, you may have to add your certificates to the *agentOptions*, e.g.:

    ```js
    agentOptions: {
        ca: [fs.readFileSync('.ssl/sub.class1.server.ca.pem'), fs.readFileSync('.ssl/ca.pem')]
    }
    ```

  * **databaseName**: *string* (Default: `_system`)

    Name of the active database.

  * **arangoVersion**: *number* (Default: `20300`)

    Value of the `x-arango-version` header.

  * **headers**: *Object* (optional)

    An object with additional headers to send with every request.

  * **agent**: *Agent* (optional)

    An http Agent instance to use for connections. This has no effect in the browser.

    By default a new [`http.Agent`](https://nodejs.org/api/http.html#http_new_agent_options) instance will be created using the *agentOptions*.

  * **agentOptions**: *Object* (Default: see below)

    An object with options for the agent. This will be ignored if *agent* is also provided and has no effect in the browser.

    Default: `{maxSockets: 3, keepAlive: true, keepAliveMsecs: 1000}`.

  * **promise**: *constructor* (optional)

    The `Promise` implementation to use or `false` to disable promises entirely (for performance).

    By default the global `Promise` constructor will be used if available.

### Manipulating databases

These functions implement the [HTTP API for manipulating databases](https://docs.arangodb.com/HttpDatabase/index.html).

#### database.useDatabase

`database.useDatabase(databaseName): void`

Updates the *Database* instance and its connection string to use the given *databaseName*.

**Arguments**

* **databaseName**: *string*

  The name of the database to use.

**Examples**

```js
var db = require('arangojs')();
db.useDatabase('test');
// The database instance now uses the database "test".
```

#### database.createDatabase

`async database.createDatabase(databaseName, [users]): void`

Creates a new database with the given *databaseName*.

**Arguments**

* **databaseName**: *string*

  Name of the database to create.

* **users**: *Array* (optional)

  If specified, the array must contain objects with the following properties:

  * *username*: the username of the user to create for the database.
  * *passwd* (optional): the password of the user. Default: empty.
  * *active* (optional): whether the user is active. Default: `true`.
  * *extra* (optional): an object containing additional user data.

**Examples**

```js
var db = require('arangojs')();
db.createDatabase('mydb', [{username: 'root'}], function (err, info) {
    if (err) return console.error(err);
    // the database has been created
});
```

#### database.get

`async database.get(): Object`

Fetches the database description for the active database from the server.

**Examples**

```js
var db = require('arangojs')();
db.get(function (err, info) {
    if (err) return console.error(err);
    // the database exists
});
```

#### database.listDatabases

`async database.listDatabases(): Array<String>`

Fetches all databases from the server and returns an array of their names.

**Examples**

```js
var db = require('arangojs')();
db.databases(function (err, names) {
    if (err) return console.error(err);
    // databases is an array of database names
});
```

#### database.listUserDatabases

`async database.listUserDatabases(): Array<String>`

Fetches all databases accessible to the active user from the server and returns an array of their names.

**Examples**

```js
var db = require('arangojs')();
db.databases(function (err, names) {
    if (err) return console.error(err);
    // databases is an array of database names
});
```

#### database.dropDatabase

`async database.dropDatabase(databaseName): void`

Deletes the database with the given *databaseName* from the server.

```js
var db = require('arangojs')();
db.dropDatabase('mydb', function (err) {
    if (err) return console.error(err);
    // database "mydb" no longer exists
})
```

#### database.truncate

`async database.truncate([excludeSystem]): void`

Deletes **all documents in all collections** in the active database.

**Arguments**

* **excludeSystem**: *boolean* (Default: `true`)

  Whether system collections should be excluded.

**Examples**

```js
var db = require('arangojs')();
db.truncate(function (err) {
    if (err) return console.error(err);
    // all non-system collections in this database are now empty
});
// --or--
db.truncate(false, function (err) {
    if (err) return console.error(err);
    // I've made a huge mistake...
});
```

### Accessing collections

These functions implement the [HTTP API for accessing collections](https://docs.arangodb.com/HttpCollection/Getting.html).

#### database.collection

`database.collection(collectionName): DocumentCollection`

Returns a *DocumentCollection* instance for the given collection name.

**Arguments**

* **collectionName**: *string*

  Name of the edge collection.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('potatos');
```

#### database.edgeCollection

`database.edgeCollection(collectionName): EdgeCollection`

Returns an *EdgeCollection* instance for the given collection name.

**Arguments**

* **collectionName**: *string*

  Name of the edge collection.

**Examples**

```js
var db = require('arangojs')();
var collection = db.edgeCollection('potatos');
```

#### database.listCollections

`async database.listCollections([excludeSystem]): Array<Object>`

Fetches all collections from the database and returns an array of collection descriptions.

**Arguments**

* **excludeSystem**: *boolean* (Default: `true`)

  Whether system collections should be excluded from the results.

**Examples**

```js
var db = require('arangojs')();
db.listCollections(function (err, collections) {
    if (err) return console.error(err);
    // collections is an array of collection descriptions
    // not including system collections
});
// --or--
db.listCollections(false, function (err, collections) {
    if (err) return console.error(err);
    // collections is an array of collection descriptions
    // including system collections
});
```

#### database.collections

`async database.collections([excludeSystem]): Array<Object>`

Fetches all collections from the database and returns an array of *DocumentCollection* and *EdgeCollection* instances for the collections.

**Arguments**

* **excludeSystem**: *boolean* (Default: `true`)

  Whether system collections should be excluded from the results.

**Examples**

```js
var db = require('arangojs')();
db.listCollections(function (err, collections) {
    if (err) return console.error(err);
    // collections is an array of DocumentCollection
    // and EdgeCollection instances
    // not including system collections
});
// --or--
db.listCollections(false, function (err, collections) {
    if (err) return console.error(err);
    // collections is an array of DocumentCollection
    // and EdgeCollection instances
    // including system collections
});
```

### Accessing graphs

These functions implement the [HTTP API for accessing general graphs](https://docs.arangodb.com/HttpGharial/index.html).

#### database.graph

`database.graph(graphName): Graph`

Returns a *Graph* instance representing the graph with the given graph name.

#### database.listGraphs

`async database.listGraphs(): Array<Object>`

Fetches all graphs from the database and returns an array of graph descriptions.

**Examples**

```js
var db = require('arangojs')();
db.listGraphs(function (err, graphs) {
    if (err) return console.error(err);
    // graphs is an array of graph descriptions
});
```

#### database.graphs

`async database.graphs(): Array<Graph>`

Fetches all graphs from the database and returns an array of *Graph* instances for the graphs.

**Examples**

```js
var db = require('arangojs')();
db.graphs(function (err, graphs) {
    if (err) return console.error(err);
    // graphs is an array of Graph instances
});
```

### Transactions

This function implements the [HTTP API for transactions](https://docs.arangodb.com/HttpTransaction/index.html).

#### database.transaction

`async database.transaction(collections, action, [params,] [lockTimeout]): any`

Performs a server-side transaction and returns its return value.

**Arguments**

* **collections**: *Object*

  An object with the following properties:

  * *read*: an array of names (or a single name) of collections that will be read from during the transaction.
  * *write*: an array of names (or a single name) of collections that will be written to or read from during the transaction.

* **action**: *string*

  A string evaluating to a JavaScript function to be executed on the server.

* **params**: *Array* (optional)

  Parameters that will be passed to the *action* function.

* **lockTimeout**: *Number* (optional)

  Determines how long the database will wait while attemping to gain locks on collections used by the transaction before timing out.

If *collections* is an array or string, it will be treated as *collections.write*.

Please note that while *action* should be a string evaluating to a well-formed JavaScript function, it's not possible to pass in a JavaScript function directly because the function needs to be evaluated on the server and will be transmitted in plain text.

For more information on transactions, see [the HTTP API documentation for transactions](https://docs.arangodb.com/HttpTransaction/index.html).

**Examples**

```js
var db = require('arangojs')();
var action = String(function () {
    // This code will be executed inside ArangoDB!
    var db = require('org/arangodb').db;
    return db._query('FOR user IN _users RETURN u.user').toArray();
});
db.transaction({read: '_users'}, action, function (err, result) {
    if (err) return console.error(err);
    // result contains the return value of the action
});
```

### Queries

This function implements the [HTTP API for single roundtrip AQL queries](https://docs.arangodb.com/HttpAqlQueryCursor/QueryResults.html).

For collection-specific queries see [fulltext queries](#fulltext-queries) and [geo-spatial queries](#geo-queries).

#### database.query

`async database.query(query, [bindVars,] [opts]): Cursor`

Performs a database query using the given *query* and *bindVars*, then returns a new *Cursor* instance for the result list to the callback.

**Arguments**

* **query**: *String*

  An AQL query string or a [query builder](https://npmjs.org/package/aqb) instance.

* **bindVars**: *Object* (optional)

  An object defining the variables to bind the query to.

* **opts**: *Object* (optional)

  Additional options that will be passed to the query API.

If *opts.count* is set to `true`, the cursor will have a *count* property set to the query result count.

For more information on *Cursor* instances see the [*Cursor API* below](#cursor-api).

**Examples**

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

These functions implement the [HTTP API for managing AQL user functions](https://docs.arangodb.com/HttpAqlUserFunctions/index.html).

#### database.listFunctions

`async database.listFunctions(): Array<Object>`

Fetches a list of all AQL user functions registered with the database.

**Examples**

```js
var db = require('arangojs')();
db.listFunctions(function (err, functions) {
    if (err) return console.error(err);
    // functions is a list of function descriptions
})
```

#### database.createFunction

`async database.createFunction(name, code): void`

Creates an AQL user function with the given *name* and *code* if it does not already exist or replaces it if a function with the same name already existed.

**Arguments**

* **name**: *String*

  A valid AQL function name, e.g.: `"myfuncs::accounting::calculate_vat"`.

* **code**: *String*

  A string evaluating to a JavaScript function (not a JavaScript function object).

**Examples**

```js
var qb = require('aqb');
var db = require('arangojs')();
var vat_fn_name = 'myfuncs::acounting::calculate_vat';
var vat_fn_code = string(function (price) {
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

#### database.dropFunction

`async database.dropFunction(name, [group]): void`

Deletes the AQL user function with the given name from the database.

**Arguments**

* **name**: *String*

  The name of the user function to drop.

* **group**: *Boolean* (Default: `false`)

  If set to `true`, all functions with a name starting with *name* will be deleted; otherwise only the function with the exact name will be deleted.

**Examples**

```js
var db = require('arangojs')();
db.dropFunction('myfuncs::acounting::calculate_vat', function (err) {
    if (err) return console.error(err);
    // the function no longer exists
});
```

## TODO Outdated

### Arbitrary HTTP routes

#### database.route

`database.route([path: string, [headers: Object]]): Route`

Returns a new *Route* instance for the given path (relative to the database) that can be used to perform arbitrary HTTP requests.

**Arguments**

* *path* (optional): relative URL of the route.
* *headers* (optional): default headers that should be send with each request to the route.

If *path* is missing, the route will refer to the base URL of the database.

For more information on *Route* instances see the [*Route API* below](#route-api).

**Examples**

```js
var db = require('arangojs')();
var myFoxxApp = db.route('my-foxx-app');
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

### cursor.all

`cursor.all([callback: Callback]): Promise<Array<any>>`

Rewinds and exhausts the cursor and passes an array containing all values returned by the query.

**Examples**

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

### cursor.next

`cursor.next([callback: Callback]): Promise<any>`

Advances the cursor and passes the next value returned by the query. If the cursor has already been exhausted, passes `undefined` instead.

**Examples**

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

### cursor.hasNext

`cursor.hasNext(): boolean`

Returns `true` if the cursor has more values or `false` if the cursor has been exhausted. Synchronous.

**Examples**

```js
cursor.all(function (err) { // exhausts the cursor
    if (err) return console.error(err);
    cursor.hasNext() === false;
});
```

### cursor.each

`cursor.each(fn: (value: any, index: number, cursor: Cursor) => any, [callback: Callback]): Promise<void>`

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

### cursor.every

`cursor.every(fn: (value: any, index: number, cursor: Cursor) => boolean, [callback: Callback]): Promise<boolean>`

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

### cursor.some

`cursor.some(fn: (value: any, index: number, cursor: Cursor) => boolean, [callback: Callback]): Promise<boolean>`

Rewinds and advances the cursor by applying the function *fn* to each value returned by the query until the cursor is exhausted or *fn* returns a value that evaluates to `true`.

Passes the return value of the last call to *fn* to the callback.

Equivalent to *Array.prototype.some*.

**Examples**

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

### cursor.map

`cursor.map(fn: (value: any, index: number, cursor: Cursor) => any, [callback: Callback]): Promise<Array<any>>`

Rewinds and exhausts the cursor by applying the function *fn* to each value returned by the query, then invokes the callback with an array of the return values.

Equivalent to *Array.prototype.map*.

**Examples**

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

### cursor.reduce

`cursor.reduce(fn: (prev: any, accu: any, index: number, cursor: Cursor) => T, [accu: T,] [callback: Callback]): Promise<T>`

Rewinds and exhausts the cursor by reducing the values returned by the query with the given function *fn*. If *accu* is not provided, the first value returned by the query will be used instead (the function will not be invoked for that value).

Equivalent to *Array.prototype.reduce*.

**Examples**

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

### cursor.rewind

`cursor.rewind(): cursor`

Rewinds the cursor. Returns the cursor.

**Examples**

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

## Route API

*Route* instances provide access for arbitrary HTTP requests. This allows easy access to Foxx apps and other HTTP APIs not covered by the driver itself.

### route.route

`route.route([path: string, [headers: Object]]): Route`

Creates a new *Route* instance representing the *path* relative to the current route. Optionally *headers* can be an object with headers which will be extended with the current route's headers and the connection's headers.

**Examples**

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
var users = route.route('users');
// equivalent to db.route('my-foxx-app/users')
```

### route.get

`route.get([path: string,] [qs: string,] [callback: Callback]): Promise<Response>`

`route.get([path: string,] [qs: Object,] [callback: Callback]): Promise<Response>`

Performs a GET request to the given URL and passes the server response to the given callback.

**Arguments**

* *path* (optional): the route-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the route.

If *qs* is an object, it will be translated to a query string.

**Examples**

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
route.get(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // GET _db/_system/my-foxx-app
});

// -- or --

route.get('users', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // GET _db/_system/my-foxx-app/users
});

// -- or --

route.get('users', {group: 'admin'}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // GET _db/_system/my-foxx-app/users?group=admin
});
```

### route.post

`route.post([path: string,] [body: string | Object, [qs: string | Object,]] [callback: Callback]): Promise<Response>`

Performs a POST request to the given URL and passes the server response to the given callback.

**Arguments**

* *path* (optional): the route-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the route.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

**Examples**

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
route.post(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app
});

// -- or --

route.post('users', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app/users
});

// -- or --

route.post('users', {
    username: 'admin',
    password: 'hunter2'
}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app/users
    // with JSON request body {"username": "admin", "password": "hunter2"}
});

// -- or --

route.post('users', {
    username: 'admin',
    password: 'hunter2'
}, {admin: true}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // POST _db/_system/my-foxx-app/users?admin=true
    // with JSON request body {"username": "admin", "password": "hunter2"}
});
```

### route.put

`route.put([path: string,] [body: string | Object, [qs: string | Object,]] [callback: Callback]): Promise<Response>`

Performs a PUT request to the given URL and passes the server response to the given callback.

**Arguments**

* *path* (optional): the route-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the route.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

**Examples**

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
route.put(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PUT _db/_system/my-foxx-app
});

// -- or --

route.put('users/admin', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PUT _db/_system/my-foxx-app/users
});

// -- or --

route.put('users/admin', {
    username: 'admin',
    password: 'hunter2'
}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PUT _db/_system/my-foxx-app/users/admin
    // with JSON request body {"username": "admin", "password": "hunter2"}
});

// -- or --

route.put('users/admin', {
    username: 'admin',
    password: 'hunter2'
}, {admin: true}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PUT _db/_system/my-foxx-app/users/admin?admin=true
    // with JSON request body {"username": "admin", "password": "hunter2"}
});
```

### route.patch

`route.patch([path: string,] [body: string | Object, [qs: string | Object,]] [callback: Callback]): Promise<Response>`

Performs a PATCH request to the given URL and passes the server response to the given callback.

**Arguments**

* *path* (optional): the route-relative URL for the request.
* *body* (optional): the request body for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the route.

If *body* is an object, it will be converted to JSON.

If *qs* is an object, it will be translated to a query string.

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
route.patch(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PATCH _db/_system/my-foxx-app
});

// -- or --

route.patch('users/admin', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PATCH _db/_system/my-foxx-app/users
});

// -- or --

route.patch('users/admin', {
    password: 'hunter2'
}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PATCH _db/_system/my-foxx-app/users/admin
    // with JSON request body {"password": "hunter2"}
});

// -- or --

route.patch('users/admin', {
    password: 'hunter2'
}, {admin: true}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // PATCH _db/_system/my-foxx-app/users/admin?admin=true
    // with JSON request body {"password": "hunter2"}
});
```

### route.delete

`route.delete([path: string,] [qs: string | Object,] [callback: Callback]): Promise<Response>`

Performs a DELETE request to the given URL and passes the server response to the given callback.

**Arguments**

* *path* (optional): the route-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the route.

If *qs* is an object, it will be translated to a query string.

**Examples**

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
route.delete(function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // DELETE _db/_system/my-foxx-app
});

// -- or --

route.delete('users/admin', function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // DELETE _db/_system/my-foxx-app/users/admin
});

// -- or --

route.delete('users/admin', {permanent: true}, function (err, result) {
    if (err) return console.error(err);
    // result is the response body of calling
    // DELETE _db/_system/my-foxx-app/users/admin?permanent=true
});
```

### route.head

`route.head([path: string,] [qs: string | Object,] [callback: Callback]): Promise<Response>`

Performs a HEAD request to the given URL and passes the server response to the given callback.

**Arguments**

* *path* (optional): the route-relative URL for the request.
* *qs* (optional): the query string for the request.

If *path* is missing, the request will be made to the base URL of the route.

If *qs* is an object, it will be translated to a query string.

**Examples**

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
route.head(function (err, result, response) {
    if (err) return console.error(err);
    // result is empty (no response body)
    // response is the response object for
    // HEAD _db/_system/my-foxx-app
});
```

### route.request

`route.request(opts: Object, [callback: Callback]): Promise<Response>`

Performs an arbitrary request to the given URL and passes the server response to the given callback.

**Arguments**

* *opts*: an object with the following properties:
 * *path*: the route-relative URL for the request.
 * *absolutePath* (optional): whether the *path* is relative to the connection's base URL instead of the route. Default: `false`.
 * *body* (optional): the request body.
 * *qs* (optional): the query string.
 * *headers* (optional): an object containing additional HTTP headers to send with the request.
 * *method* (optional): HTTP method to use. Default: `"GET"`.

If *opts.path* is missing, the request will be made to the base URL of the route.

If *opts.body* is an object, it will be converted to JSON.

If *opts.qs* is an object, it will be translated to a query string.

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
route.request({
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

These functions implement the [HTTP API for manipulating collections](https://docs.arangodb.com/HttpCollection/index.html).

The *Collection API* is implemented by all *Collection* instances, regardless of their specific type. I.e. it represents a shared subset between instances of [*DocumentCollection*](#documentcollection-api), [*EdgeCollection*](#edgecollection-api), [*GraphVertexCollection*](#graphvertexcollection-api) and [*GraphEdgeCollection*](#graphedgecollection-api).

### Getting information about the collection

See [the HTTP API documentation](https://docs.arangodb.com/HttpCollection/Getting.html) for details.

#### collection.create

`collection.create(properties: Object, [callback: Callback]): Promise<Collection>`

Creates a collection from the given *properties*, then passes a new *Collection* instance to the callback.

For more information on the *properties* object, see [the HTTP API documentation for creating collections](https://docs.arangodb.com/HttpCollection/Creating.html).

**Examples**

```js
var db = require('arangojs')();
collection.create(function (err, collection) {
    if (err) return console.error(err);
    // collection is a DocumentCollection instance
    // see the Collection API and DocumentCollection API below for details
});

// -- or --

collection.create({
    waitForSync: true // always sync document changes to disk
}, function (err, collection) {
    if (err) return console.error(err);
    // collection is a DocumentCollection instance
    // see the Collection API and DocumentCollection API below for details
});
```

#### collection.properties

`collection.properties([callback: Callback]): Promise<any>`

Retrieves the collection's properties.

**Examples**

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

#### collection.count

`collection.count([callback: Callback]): Promise<any>`

Retrieves the number of documents in a collection.

**Examples**

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

#### collection.figures

`collection.figures([callback: Callback]): Promise<any>`

Retrieves statistics for a collection.

**Examples**

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

#### collection.revision

`collection.revision([callback: Callback]): Promise<any>`

Retrieves the collection revision ID.

**Examples**

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

#### collection.checksum

`collection.checksum([opts: Object,] [callback: Callback]): Promise<any>`

Retrieves the collection checksum.

For information on the possible options see [the HTTP API for getting collection information](https://docs.arangodb.com/HttpCollection/Getting.html).

**Examples**

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

#### collection.load

`collection.load([count: boolean,] [callback: Callback]): Promise<any>`

Tells the server to load the collection into memory.

If *count* is set to `false`, the return value will not include the number of documents in the collection (which may speed up the process).

**Examples**

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

#### collection.unload

`collection.unload([callback: Callback]): Promise<any>`

Tells the server to remove the collection from memory.

**Examples**

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

#### collection.setProperties

`collection.setProperties(properties: Object, [callback: Callback]): Promise<any>`

Replaces the properties of the collection.

For information on the *properties* argument see [the HTTP API for modifying collections](https://docs.arangodb.com/HttpCollection/Modifying.html).

**Examples**

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

#### collection.rename

`collection.rename(name: string, [callback: Callback]): Promise<any>`

Renames the collection. The *Collection* instance will automatically update its name according to the server response.

**Examples**

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

#### collection.rotate

`collection.rotate([callback: Callback]): Promise<any>`

Rotates the journal of the collection.

**Examples**

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

#### collection.truncate

`collection.truncate([callback: Callback]): Promise<any>`

Deletes **all documents** in the collection in the database.

**Examples**

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

#### collection.drop

`collection.drop([callback: Callback]): Promise<any>`

Deletes the collection from the database.

Equivalent to *database.dropCollection(collection.name, [callback: Callback])*.: Promise

**Examples**

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

These functions implement the [HTTP API for manipulating indexes](https://docs.arangodb.com/HttpIndexes/index.html).

#### collection.createIndex

`collection.createIndex(details: Object, [callback: Callback]): Promise<Index>`

Creates an arbitrary index on the collection.

For information on the possible properties of the *details* object, see [the HTTP API for manipulating indexes](https://docs.arangodb.com/HttpIndexes/WorkingWith.html).

**Examples**

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

#### collection.createCapConstraint

`collection.createCapConstraint(size: Object | number, [callback: Callback]): Promise<Index>`

Creates a cap constraint index on the collection.

**Arguments**

* *size*: an object with any of the following properties:
 * *size*: the maximum number of documents in the collection.
 * *byteSize*: the maximum size of active document data in the collection (in bytes).

If *size* is a number, it will be interpreted as *size.size*.

 For more information on the properties of the *size* object see [the HTTP API for creating cap constraints](https://docs.arangodb.com/HttpIndexes/Cap.html).

**Examples**

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

#### collection.createHashIndex

`collection.createHashIndex(fields: Array<string> | string, [opts: Object | boolean,] [callback: Callback]): Promise<Index>`

Creates a hash index on the collection.

**Arguments**

* *fields*: an array of document fields on which to create the index.
* *opts* (optional): additional options for this index.

If *opts* is a boolean, it will be interpreted as *opts.unique*.

If *fields* is a string, it will be wrapped in an array automatically.

For more information on hash indexes, see [the HTTP API for hash indexes](https://docs.arangodb.com/HttpIndexes/Hash.html).

**Examples**

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

#### collection.createSkipList

`collection.createSkipList(fields: Array<string> | string, [opts: Object | boolean,] [opts: Object,] [callback: Callback]): Promise<Index>`

Creates a skiplist index on the collection.

**Arguments**

* *fields*: an array of document fields on which to create the index.
* *opts* (optional): additional options for this index.

If *opts* is a boolean, it will be interpreted as *opts.unique*.

If *fields* is a string, it will be wrapped in an array automatically.

For more information on skiplist indexes, see [the HTTP API for skiplist indexes](https://docs.arangodb.com/HttpIndexes/Skiplist.html).

**Examples**

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

#### collection.createGeoIndex

`collection.createGeoIndex(fields: Array<string> | string, [opts: Object,] [callback: Callback]): Promise<Index>`

Creates a geo-spatial index on the collection.

**Arguments**

* *fields*: an array of document fields on which to create the index. Currently, fulltext indexes must cover exactly one field.
* *opts* (optional): an object containing additional properties of the index.

If *fields* is a string, it will be wrapped in an array automatically.

For more information on the properties of the *opts* object see [the HTTP API for manipulating geo indexes](https://docs.arangodb.com/HttpIndexes/Geo.html).

**Examples**

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

#### collection.createFulltextIndex

`collection.createFulltextIndex(fields: Array<string> | string, [minLength: number,] [callback: Callback]): Promise<Index>`

Creates a fulltext index on the collection.

**Arguments**

* *fields*: an array of document fields on which to create the index. Currently, fulltext indexes must cover exactly one field.
* *minLength* (optional): minimum character length of words to index. Uses a server-specific default value if not specified.

If *fields* is a string, it will be wrapped in an array automatically.

For more information on fulltext indexes, see [the HTTP API for fulltext indexes](https://docs.arangodb.com/HttpIndexes/Fulltext.html).

**Examples**

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

#### collection.index

`collection.index(indexHandle: string | Index, [callback: Callback]): Promise<Index>`

Fetches information about the index with the given *indexHandle* and passes it to the given callback.

The value of *indexHandle* can either be a fully-qualified *index.id* or the collection-specific key of the index.

**Examples**

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

#### collection.indexes

`collection.indexes([callback: Callback]): Promise<Array<Index>>`

Fetches a list of all indexes on this collection.

**Examples**

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

#### collection.dropIndex

`collection.dropIndex(indexHandle: string | Index, [callback: Callback]): Promise<any>`

Deletes the index with the given *indexHandle* from the collection.

The value of *indexHandle* can either be a fully-qualified *index.id* or the collection-specific key of the index.

**Examples**

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

#### collection.fulltext

`collection.fulltext(fieldName: string, query: string, [opts: Object,] [callback: Callback]): Promise<Cursor>`

Performs a fulltext query searching for *query* in the given *fieldName* of all documents in this collection.

**Arguments**

* *fieldName*: the name of the field to search.
* *query*: a fulltext query string.
* *opts* (optional): an object containing additional options for the query.

For more information on the properties of the *opts* object see [the HTTP API for fulltext queries](https://docs.arangodb.com/HttpIndexes/Fulltext.html).

For more information on *Cursor* instances see the [*Cursor API* above](#cursor-api).

**Examples**

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

### Geo queries

These functions implement the [HTTP API for geo-spatial queries](https://docs.arangodb.com/HttpIndexes/Geo.html).

Note that a collection must have geo-spatial indexes in order to perform geo-spatial queries on it.

#### collection.near

`collection.near(latitude: number, longitude: number, [opts: Object,] [callback: Callback]): Promise<Cursor>`

Performs a geo-spatial query for documents near the given location.

**Arguments**

* *latitude*: latitude of the target location.
* *longitude*: longitude of the target location.
* *opts* (optional): an object containing additional options for the query.

For more information on the properties of the *opts* object see [the HTTP API for geo-spatial queries](https://docs.arangodb.com/HttpIndexes/Geo.html).

For more information on *Cursor* instances see the [*Cursor API* above](#cursor-api).

**Examples**

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createGeoIndex('location', function (err) {
        if (err) return console.error(err);
        collection.near(0, 0, {
            limit: 100,
            distance: 'distance'
        }, function (err, cursor) {
            if (err) return console.error(err);
            // cursor is a Cursor instance for the closest 100 query results
            // each result has an additional property "distance" containing
            // the document's distance to the target location in meters
        });
    });
});
```

#### collection.within

`collection.within(latitude: number, longitude: number, radius: number, [opts: Object,] [callback: Callback]): Promise<Cursor>`

Performs a geo-spatial query for documents within the given *radius* of the given location.

**Arguments**

* *latitude*: latitude of the target location.
* *longitude*: longitude of the target location.
* *radius*: the search radius (in meters).
* *opts* (optional): an object containing additional options for the query.

For more information on the properties of the *opts* object see [the HTTP API for geo-spatial queries](https://docs.arangodb.com/HttpIndexes/Geo.html).

For more information on *Cursor* instances see the [*Cursor API* above](#cursor-api).

**Examples**

```js
var db = require('arangojs')();
db.collection('some-collection', function (err, collection) {
    if (err) return console.error(err);
    collection.createGeoIndex('location', function (err) {
        if (err) return console.error(err);
        collection.within(0, 0, 500, {
            limit: 100,
            distance: 'distance'
        }, function (err, cursor) {
            if (err) return console.error(err);
            // cursor is a Cursor instance for the closest 100 query results
            // within up to 500 meters of the target location
            // each result has an additional property "distance" containing
            // the document's distance to the target location in meters
        });
    });
});
```

### Bulk importing documents

This function implements the [HTTP API for bulk imports](https://docs.arangodb.com/HttpBulkImports/index.html).

#### collection.import

`collection.import(data: Array<Object> | Array<Array<any>>, [opts: Object,] [callback: Callback]): Promise<any>`

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

**Examples**

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

These functions implement the [HTTP API for manipulating documents](https://docs.arangodb.com/HttpDocument/index.html).

#### collection.replace

`collection.replace(documentHandle: string | Document, data: Object, [opts: Object,] [callback: Callback]): Promise<any>`

Replaces the content of the document with the given *documentHandle* with the given *data*.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until the document has been synced to disk. Default: `false`.
* *rev*: Only replace the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

**Examples**

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

#### collection.update

`collection.update(documentHandle: string | Document, data: Object, [opts: Object,] [callback: Callback]): Promise<any>`

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

**Examples**

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

#### collection.remove

`collection.remove(documentHandle: string | Document, [opts: Object,] [callback: Callback]): Promise<any>`

Deletes the document with the given *documentHandle* from the collection.

If *opts* is set, it must be an object with any of the following properties:

* *waitForSync*: Wait until document has been synced to disk. Default: `false`
* *rev*: Only update the document if it matches this revision. Optional.
* *policy*: Determines the behaviour when the revision is not matched:
 * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
 * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

**Examples**

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

#### collection.all

`collection.all([type: string,] [callback: Callback]): Promise<Array<Object>>`

Retrieves a list of all documents in the collection.

If *type* is set to `"key"`, the result will be the `_key` of each document.

If *type* is set to `"path"`, the result will be the document URI paths.

If *type* is set to `"id"` or not set, the result will be the `_id` of each document.

#### collection.byKeys

`collection.byKeys(keys: Array<string>, [callback: Callback]): Promise<Array<Object>>`

Retrieves a list of the documents with the given keys in the collection.

### DocumentCollection API

The *DocumentCollection API* extends the [*Collection API* (see above)](#collection-api) with the following methods.

#### documentCollection.document

`documentCollection.document(documentHandle: string | Document, [callback: Callback]): Promise<Document>`

Retrieves the document with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

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

#### documentCollection.save

`documentCollection.save(data: Object, [callback: Callback]): Promise<Document>`

Creates a new document with the given *data*.

**Examples**

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

#### edgeCollection.edge

`edgeCollection.edge(documentHandle: string | Document, [callback: Callback]): Promise<Document>`

Retrieves the edge with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of an edge in the collection, or an edge (i.e. an object with an `_id` or `_key` property).

**Examples**

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

#### edgeCollection.save

`edgeCollection.save(data: Object, fromId: string | Object, toId: string | Object, [callback: Callback]): Promise<Document>`

Creates a new edge between the documents *fromId* and *toId* with the given *data*.

If *fromId* and *toId* are not specified, the *data* needs to contain the properties *_from* and *_to*.

**Examples**

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

#### edgeCollection.edges

`edgeCollection.edges(documentHandle: string | Document, [callback: Callback]): Promise<Array<Document>>`

Retrieves a list of all edges of the document with the given *documentHandle*.

The *documentHandle* can be either the `_id` or the `_key` of a document in any collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

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

#### edgeCollection.inEdges

`edgeCollection.inEdges(documentHandle: string | Document, [callback: Callback]): Promise<Array<Document>>`

Retrieves a list of all incoming edges of the document with the given *documentHandle*.

The *documentHandle* can be either the `_id` or the `_key` of a document in any collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

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

#### edgeCollection.outEdges

`edgeCollection.outEdges(documentHandle: string | Document, [callback: Callback]): Promise<Array<Document>>`

Retrieves a list of all outgoing edges of the document with the given *documentHandle*.

The *documentHandle* can be either the `_id` or the `_key` of a document in any collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

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

#### edgeCollection.traversal

`edgeCollection.traversal(startVertex: string | Document, [opts: Object,] [callback: Callback]): Promise<Object>`

Performs a traversal starting from the given *startVertex* and following edges contained in this edge collection.

See [the HTTP API documentation](https://docs.arangodb.com/HttpTraversal/index.html) for details on the additional arguments.

Please note that while *opts.filter*, *opts.visitor*, *opts.init*, *opts.expander* and *opts.sort* should be strings evaluating to well-formed JavaScript code, it's not possible to pass in JavaScript functions directly because the code needs to be evaluated on the server and will be transmitted in plain text.

**Examples**

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

These functions implement the [HTTP API for manipulating graphs](https://docs.arangodb.com/HttpGharial/index.html).

#### graph.create

`graph.create(properties: Object, [callback: Callback]): Promise<Graph>`

Creates a graph with the given *properties*, then passes a new *Graph* instance to the callback.

For more information on the *properties* object, see [the HTTP API documentation for creating graphs](https://docs.arangodb.com/HttpGharial/Management.html).

**Examples**

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

### graph.drop

`graph.drop([dropCollections: boolean,] [callback: Callback]): Promise<any>`

Deletes the graph from the database.

If *dropCollections* is set to `true`, the collections associated with the graph will also be deleted.

Equivalent to *database.dropGraph(graph.name, [callback: Callback])*.: Promise

**Examples**

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

#### graph.vertexCollection

`graph.vertexCollection(collectionName: string, [callback: Callback]): Promise<GraphVertexCollection>`

Fetches the vertex collection with the given *collectionName* from the database, then passes a new [*GraphVertexCollection* instance](#graphvertexcollection-api) to the callback.

**Examples**

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

#### graph.addVertexCollection

`graph.addVertexCollection(collectionName: string, [callback: Callback]): Promise<any>`

Adds the collection with the given *collectionName* to the graph's vertex collections.

**Examples**

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

#### graph.removeVertexCollection

`graph.removeVertexCollection(collectionName: string, [dropCollection: boolean,] [callback: Callback]): Promise<any>`

Removes the vertex collection with the given *collectionName* from the graph.

If *dropCollection* is set to `true`, the collection will also be deleted from the database.

**Examples**

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

#### graph.edgeCollection

`graph.edgeCollection(collectionName: string, [callback: Callback]): Promise<GraphEdgeCollection>`

Fetches the edge collection with the given *collectionName* from the database, then passes a new [*GraphEdgeCollection* instance](#graphedgecollection-api) to the callback.

**Examples**

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

#### graph.addEdgeDefinition

`graph.addEdgeDefinition(definition: Object, [callback: Callback]): Promise<any>`

Adds the given edge definition *definition* to the graph.

For more information on edge definitions see [the HTTP API for managing graphs](https://docs.arangodb.com/HttpGharial/Management.html).

**Examples**

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

#### graph.replaceEdgeDefinition

`graph.replaceEdgeDefinition(collectionName: string, definition: Object, [callback: Callback]): Promise<any>`

Replaces the edge definition for the edge collection named *collectionName* with the given *definition*.

For more information on edge definitions see [the HTTP API for managing graphs](https://docs.arangodb.com/HttpGharial/Management.html).

**Examples**

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

#### graph.removeEdgeDefinition

`graph.removeEdgeDefinition(definitionName: string, [dropCollection: boolean,] [callback: Callback]): Promise<any>`

Removes the edge definition with the given *definitionName* form the graph.

If *dropCollection* is set to `true`, the edge collection associated with the definition will also be deleted from the database.

For more information on edge definitions see [the HTTP API for managing graphs](https://docs.arangodb.com/HttpGharial/Management.html).

**Examples**

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

#### graph.traversal

`graph.traversal(startVertex: string | Document, [opts: Object,] [callback: Callback]): Promise<Object>`

Performs a traversal starting from the given *startVertex* and following edges contained in any of the edge collections of this graph.

See [the HTTP API documentation](https://docs.arangodb.com/HttpTraversal/index.html) for details on the additional arguments.

Please note that while *opts.filter*, *opts.visitor*, *opts.init*, *opts.expander* and *opts.sort* should be strings evaluating to well-formed JavaScript functions, it's not possible to pass in JavaScript functions directly because the functions need to be evaluated on the server and will be transmitted in plain text.

**Examples**

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

#### graphVertexCollection.vertex

`graphVertexCollection.vertex(documentHandle: string | Document, [callback: Callback]): Promise<Document>`

Retrieves the vertex with the given *documentHandle* from the collection.

The *documentHandle* can be either the `_id` or the `_key` of a vertex in the collection, or a vertex (i.e. an object with an `_id` or `_key` property).

**Examples**

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

#### graphVertexCollection.save

`graphVertexCollection.save(data: Object, [callback: Callback]): Promise<Document>`

Creates a new vertex with the given *data*.

**Examples**

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

#### graphEdgeCollection.edge

`graphEdgeCollection.edge(documentHandle: string | Document, [callback: Callback]): Promise<Document>`

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

#### graphEdgeCollection.save

`graphEdgeCollection.save(data: Object, [fromId: string | Document, toId: string | Document,] [callback: Callback]): Promise<Document>`

Creates a new edge between the vertices *fromId* and *toId* with the given *data*.

If *fromId* and *toId* are not specified, the *data* needs to contain the properties *_from* and *_to*.

**Examples**

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
