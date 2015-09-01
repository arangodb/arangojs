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

For expected API errors, *err* will be an instance of *ArangoError*. For any other error responses (4xx/5xx status code), *err* will be an instance of the apropriate [http-errors](https://github.com/jshttp/http-errors) error type. If the response indicates success but the response body could not be parsed, *err* will be a *SyntaxError*. In all of these cases the error object will additionally have a *response* property containing the server response object.

If `Promise` is defined globally, asynchronous functions also return a promise. When using both node-style callbacks and promises, the node-style callback will be invoked before the promise's fulfillment/rejection handlers.

If you want to use promises in environments that don't provide the global `Promise` constructor, use a promise polyfill like [es6-promise](https://www.npmjs.com/package/es6-promise) or inject a ES6-compatible promise implementation like [bluebird](https://www.npmjs.com/package/bluebird) into the global scope.

## Database API

### new Database

`new Database([config]): Database`

Creates a new *Database* instance.

If *config* is a string, it will be interpreted as *config.url*.

**Arguments**

* **config**: `Object` (optional)

  An object with the following properties:

  * **url**: `string` (Default: `http://localhost:8529`)

    Base URL of the ArangoDB server.

    If you want to use ArangoDB with HTTP Basic authentication, you can provide the credentials as part of the URL, e.g. `http://user:pass@localhost:8529`.

    The driver automatically uses HTTPS if you specify an HTTPS *url*.

    If you need to support self-signed HTTPS certificates, you may have to add your certificates to the *agentOptions*, e.g.:

    ```js
    agentOptions: {
        ca: [fs.readFileSync('.ssl/sub.class1.server.ca.pem'), fs.readFileSync('.ssl/ca.pem')]
    }
    ```

  * **databaseName**: `string` (Default: `_system`)

    Name of the active database.

  * **arangoVersion**: `number` (Default: `20300`)

    Value of the `x-arango-version` header.

  * **headers**: `Object` (optional)

    An object with additional headers to send with every request.

  * **agent**: `Agent` (optional)

    An http Agent instance to use for connections. This has no effect in the browser.

    By default a new [`http.Agent`](https://nodejs.org/api/http.html#http_new_agent_options) instance will be created using the *agentOptions*.

  * **agentOptions**: `Object` (Default: see below)

    An object with options for the agent. This will be ignored if *agent* is also provided and has no effect in the browser.

    Default: `{maxSockets: 3, keepAlive: true, keepAliveMsecs: 1000}`.

  * **promise**: `Class` (optional)

    The `Promise` implementation to use or `false` to disable promises entirely (for performance).

    By default the global `Promise` constructor will be used if available.

### Manipulating databases

These functions implement the [HTTP API for manipulating databases](https://docs.arangodb.com/HttpDatabase/index.html).

#### database.useDatabase

`database.useDatabase(databaseName): Object`

Updates the *Database* instance and its connection string to use the given *databaseName*.

**Arguments**

* **databaseName**: `string`

  The name of the database to use.

**Examples**

```js
var db = require('arangojs')();
db.useDatabase('test');
// The database instance now uses the database "test".
```

#### database.createDatabase

`async database.createDatabase(databaseName, [users]): Object`

Creates a new database with the given *databaseName*.

**Arguments**

* **databaseName**: `string`

  Name of the database to create.

* **users**: `Array<Object>` (optional)

  If specified, the array must contain objects with the following properties:

  * **username**: `string`

    The username of the user to create for the database.

  * **passwd**: `string` (Default: `undefined`)

    The password of the user.

  * **active**: `boolean` (Default: `true`)

    Whether the user is active.

  * **extra**: `Object` (optional)

    An object containing additional user data.

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

`async database.listDatabases(): Array<string>`

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

`async database.listUserDatabases(): Array<string>`

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

`async database.dropDatabase(databaseName): Object`

Deletes the database with the given *databaseName* from the server.

```js
var db = require('arangojs')();
db.dropDatabase('mydb', function (err) {
    if (err) return console.error(err);
    // database "mydb" no longer exists
})
```

#### database.truncate

`async database.truncate([excludeSystem]): Object`

Deletes **all documents in all collections** in the active database.

**Arguments**

* **excludeSystem**: `boolean` (Default: `true`)

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

* **collectionName**: `string`

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

* **collectionName**: `string`

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

* **excludeSystem**: `boolean` (Default: `true`)

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

`async database.collections([excludeSystem]): Array<Collection>`

Fetches all collections from the database and returns an array of *DocumentCollection* and *EdgeCollection* instances for the collections.

**Arguments**

* **excludeSystem**: `boolean` (Default: `true`)

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

`async database.transaction(collections, action, [params,] [lockTimeout]): Object`

Performs a server-side transaction and returns its return value.

**Arguments**

* **collections**: `Object`

  An object with the following properties:

  * **read**: `Array<string>` (optional)

    An array of names (or a single name) of collections that will be read from during the transaction.

  * **write**: `Array<string>` (optional)

    An array of names (or a single name) of collections that will be written to or read from during the transaction.

* **action**: `string`

  A string evaluating to a JavaScript function to be executed on the server.

* **params**: `Array<any>` (optional)

  Parameters that will be passed to the *action* function.

* **lockTimeout**: `number` (optional)

  Determines how long the database will wait while attemping to gain locks on collections used by the transaction before timing out.

If *collections* is an array or string, it will be treated as *collections.write*.

Please note that while *action* should be a string evaluating to a well-formed JavaScript function, it's not possible to pass in a JavaScript function directly because the function needs to be evaluated on the server and will be transmitted in plain text.

For more information on transactions, see [the HTTP API documentation for transactions](https://docs.arangodb.com/HttpTransaction/index.html).

**Examples**

```js
var db = require('arangojs')();
var action = string(function () {
    // This code will be executed inside ArangoDB!
    var db = require('org/arangodb').db;
    return db._query('FOR user IN _users RETURN u.user').toArray<any>();
});
db.transaction({read: '_users'}, action, function (err, result) {
    if (err) return console.error(err);
    // result contains the return value of the action
});
```

### Queries

This function implements the [HTTP API for single roundtrip AQL queries](https://docs.arangodb.com/HttpAqlQueryCursor/QueryResults.html).

For collection-specific queries see [simple queries](#simple-queries).

#### database.query

`async database.query(query, [bindVars,] [opts]): Cursor`

Performs a database query using the given *query* and *bindVars*, then returns a [new *Cursor* instance](#cursor-api) for the result list.

**Arguments**

* **query**: `string`

  An AQL query string or a [query builder](https://npmjs.org/package/aqb) instance.

* **bindVars**: `Object` (optional)

  An object defining the variables to bind the query to.

* **opts**: `Object` (optional)

  Additional options that will be passed to the query API.

If *opts.count* is set to `true`, the cursor will have a *count* property set to the query result count.

If *query* is an object with *query* and *bindVars* properties, those will be used as the values of the respective arguments instead.

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

#### aqlQuery

`aqlQuery(strings, ...args): Object`

Template string handler for AQL queries. Converts an ES2015 template string to an object that can be passed to `database.query` by converting arguments to bind variables.

Any *Collection* instances will automatically be converted to collection bind variables.

**Examples**

```js
var db = require('arangojs')();
var aqlQuery = require('arangojs').aqlQuery;
var userCollection = db.collection('_users');
var role = 'admin';
db.query(
  aqlQuery`
    FOR user IN ${userCollection}
    FILTER user.role == ${role}
    RETURN user
  `,
  function (err, cursor) {
    if (err) return console.error(err);
    // cursor is a cursor for the query result
  }
);
// -- is equivalent to --
db.query(
  'FOR user IN @@value0 FILTER user.role == @value1 RETURN user',
  {'@value0': userCollection.name, value1: role},
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

`async database.createFunction(name, code): Object`

Creates an AQL user function with the given *name* and *code* if it does not already exist or replaces it if a function with the same name already existed.

**Arguments**

* **name**: `string`

  A valid AQL function name, e.g.: `"myfuncs::accounting::calculate_vat"`.

* **code**: `string`

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

`async database.dropFunction(name, [group]): Object`

Deletes the AQL user function with the given name from the database.

**Arguments**

* **name**: `string`

  The name of the user function to drop.

* **group**: `boolean` (Default: `false`)

  If set to `true`, all functions with a name starting with *name* will be deleted; otherwise only the function with the exact name will be deleted.

**Examples**

```js
var db = require('arangojs')();
db.dropFunction('myfuncs::acounting::calculate_vat', function (err) {
    if (err) return console.error(err);
    // the function no longer exists
});
```

### Arbitrary HTTP routes

#### database.route

`database.route([path,] [headers]): Route`

Returns a new *Route* instance for the given path (relative to the database) that can be used to perform arbitrary HTTP requests.

**Arguments**

* **path**: `string` (optional)

  The database-relative URL of the route.

* **headers**: `Object` (optional)

  Default headers that should be sent with each request to the route.

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

*Cursor* instances provide an abstraction over the HTTP API's limitations. Unless a method explicitly exhausts the cursor, the driver will only fetch as many batches from the server as necessary. Unlike the server-side cursors, *Cursor* instances can also be rewound.

```js
var db = require('arangojs')();
db.query(someQuery, function (err, cursor) {
    if (err) return console.error(err);
    // cursor represents the query results
});
```

### cursor.count

`cursor.count: number`

The total number of documents in the query result.

### cursor.all

`async cursor.all(): Array<Object>`

Rewinds and exhausts the cursor, then returns an array containing all values returned by the query.

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

`async cursor.next(): Object`

Advances the cursor and returns the next value returned by the query. If the cursor has already been exhausted, returns `undefined` instead.

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

Returns `true` if the cursor has more values or `false` if the cursor has been exhausted.

**Examples**

```js
cursor.all(function (err) { // exhausts the cursor
    if (err) return console.error(err);
    cursor.hasNext() === false;
});
```

### cursor.each

`async cursor.each(fn): any`

Rewinds and exhausts the cursor by applying the function *fn* to each value returned by the query.

Returns the last return value of *fn*.

Equivalent to *Array.prototype.forEach* (except async).

**Arguments**

* **fn**: `Function`

  A function that will be invoked for each value returned by the query until it explicitly returns `false` or the cursor is exhausted.

  The function receives the following arguments:

  * **value**: `any`

    The value returned by the query.

  * **index**: `number`

    The index of the value.

  * **cursor**: `Cursor`

    The cursor itself.

**Examples**

```js
var results = [];
function doStuff(value) {
  var VALUE = value.toUpperCase();
  results.push(VALUE);
  return VALUE;
}
// query result: ['a', 'b', 'c']
cursor.each(doStuff, function (err, last) {
    if (err) return console.error(err);
    String(results) === 'A,B,C';
    cursor.hasNext() === false;
    last === 'C';
});
```

### cursor.every

`async cursor.every(fn): boolean`

Rewinds and advances the cursor by applying the function *fn* to each value returned by the query until the cursor is exhausted or *fn* returns a value that evaluates to `false`.

Returns the last return value of *fn*.

Equivalent to *Array.prototype.every* (except async).

**Arguments**

* **fn**: `Function`

  A function that will be invoked for each value returned by the query until it returns a value that evaluates to `false` or the cursor is exhausted.

  The function receives the following arguments:

  * **value**: `any`

    The value returned by the query.

  * **index**: `number`

    The index of the value.

  * **cursor**: `Cursor`

    The cursor itself.

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

`async cursor.some(fn): boolean`

Rewinds and advances the cursor by applying the function *fn* to each value returned by the query until the cursor is exhausted or *fn* returns a value that evaluates to `true`.

Returns the return value of the last call to *fn*.

Equivalent to *Array.prototype.some* (except async).

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

`cursor.map(fn): Array<any>`

Rewinds and advances the cursor by applying the function *fn* to each value returned by the query until the cursor is exhausted.

Returns an array of the return values of *fn*.

Equivalent to *Array.prototype.map* (except async).

**Arguments**

* **fn**: `Function`

  A function that will be invoked for each value returned by the query until the cursor is exhausted.

  The function receives the following arguments:

  * **value**: `any`

    The value returned by the query.

  * **index**: `number`

    The index of the value.

  * **cursor**: `Cursor`

    The cursor itself.

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

`cursor.reduce(fn, [accu]): any`

Rewinds and exhausts the cursor by reducing the values returned by the query with the given function *fn*. If *accu* is not provided, the first value returned by the query will be used instead (the function will not be invoked for that value).

Equivalent to *Array.prototype.reduce* (except async).

**Arguments**

* **fn**: `Function`

  A function that will be invoked for each value returned by the query until the cursor is exhausted.

  The function receives the following arguments:

  * **accu**: `any`

    The return value of the previous call to *fn*. If this is the first call, *accu* will be set to the *accu* value passed to *reduce* or the first value returned by the query.

  * **value**: `any`

    The value returned by the query.

  * **index**: `number`

    The index of the value.

  * **cursor**: `Cursor`

    The cursor itself.

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

`route.route([path], [headers]): Route`

Returns a new *Route* instance for the given path (relative to the current route) that can be used to perform arbitrary HTTP requests.

**Arguments**

* **path**: `string` (optional)

  The relative URL of the route.

* **headers**: `Object` (optional)

  Default headers that should be sent with each request to the route.

If *path* is missing, the route will refer to the base URL of the database.

**Examples**

```js
var db = require('arangojs')();
var route = db.route('my-foxx-app');
var users = route.route('users');
// equivalent to db.route('my-foxx-app/users')
```

### route.get

`async route.get([path,] [qs]): Response`

Performs a GET request to the given URL and returns the server response.

**Arguments**

* **path**: `string` (optional)

  The route-relative URL for the request. If omitted, the request will be made to the base URL of the route.

* **qs**: `string` (optional)

  The query string for the request. If *qs* is an object, it will be translated to a query string.


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

`async route.post([path,] [body, [qs]]): Response`

Performs a POST request to the given URL and returns the server response.

**Arguments**

* **path**: `string` (optional)

  The route-relative URL for the request. If omitted, the request will be made to the base URL of the route.

* **body**: `string` (optional)

  The response body. If *body* is an object, it will be encoded as JSON.

* **qs**: `string` (optional)

  The query string for the request. If *qs* is an object, it will be translated to a query string.

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

`async route.put([path,] [body, [qs]]): Response`

Performs a PUT request to the given URL and returns the server response.

**Arguments**

* **path**: `string` (optional)

  The route-relative URL for the request. If omitted, the request will be made to the base URL of the route.

* **body**: `string` (optional)

  The response body. If *body* is an object, it will be encoded as JSON.

* **qs**: `string` (optional)

  The query string for the request. If *qs* is an object, it will be translated to a query string.

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

`async route.patch([path,] [body, [qs]]): Response`

Performs a PATCH request to the given URL and returns the server response.

**Arguments**

* **path**: `string` (optional)

  The route-relative URL for the request. If omitted, the request will be made to the base URL of the route.

* **body**: `string` (optional)

  The response body. If *body* is an object, it will be encoded as JSON.

* **qs**: `string` (optional)

  The query string for the request. If *qs* is an object, it will be translated to a query string.

**Examples**

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

`async route.delete([path,] [qs]): Response`

Performs a DELETE request to the given URL and returns the server response.

**Arguments**

* **path**: `string` (optional)

  The route-relative URL for the request. If omitted, the request will be made to the base URL of the route.

* **qs**: `string` (optional)

  The query string for the request. If *qs* is an object, it will be translated to a query string.

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

`async route.head([path,] [qs]): Response`

Performs a HEAD request to the given URL and returns the server response.

**Arguments**

* **path**: `string` (optional)

  The route-relative URL for the request. If omitted, the request will be made to the base URL of the route.

* **qs**: `string` (optional)

  The query string for the request. If *qs* is an object, it will be translated to a query string.

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

`async route.request([opts]): Response`

Performs an arbitrary request to the given URL and returns the server response.

**Arguments**

* **opts**: `Object` (optional)

  An object with any of the following properties:

  * **path**: `string` (optional)

    The route-relative URL for the request. If omitted, the request will be made to the base URL of the route.

  * **absolutePath**: `boolean` (Default: `false`)

    Whether the *path* is relative to the connection's base URL instead of the route.

  * **body**: `string` (optional)

    The response body. If *body* is an object, it will be encoded as JSON.

  * **qs**: `string` (optional)

    The query string for the request. If *qs* is an object, it will be translated to a query string.

  * **headers**: `Object` (optional)

    An object containing additional HTTP headers to be sent with the request.

  * **method**: `string` (Default: `"GET"`)

    HTTP method of this request.

**Examples**

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

#### collection.get

`async collection.get(): Object`

Retrieves general information about the collection.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.get(function (err, data) {
    if (err) return console.error(err);
    // data contains general information about the collection
});
```

#### collection.properties

`async collection.properties(): Object`

Retrieves the collection's properties.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.properties(function (err, data) {
    if (err) return console.error(err);
    // data contains the collection's properties
});
```

#### collection.count

`async collection.count(): Object`

Retrieves information about the number of documents in a collection.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.count(function (err, data) {
    if (err) return console.error(err);
    // data contains the collection's count
});
```

#### collection.figures

`async collection.figures(): Object`

Retrieves statistics for a collection.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.figures(function (err, data) {
    if (err) return console.error(err);
    // data contains the collection's figures
});
```

#### collection.revision

`async collection.revision(): Object`

Retrieves the collection revision ID.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.revision(function (err, data) {
    if (err) return console.error(err);
    // data contains the collection's revision
});
```

#### collection.checksum

`async collection.checksum([opts]): Object`

Retrieves the collection checksum.

**Arguments**

* **opts**: `Object` (optional)

  For information on the possible options see [the HTTP API for getting collection information](https://docs.arangodb.com/HttpCollection/Getting.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.checksum(function (err, data) {
    if (err) return console.error(err);
    // data contains the collection's checksum
});
```

### Manipulating the collection

These functions implement [the HTTP API for modifying collections](https://docs.arangodb.com/HttpCollection/Modifying.html).

#### collection.create

`async collection.create([properties]): Object`

Creates a collection with the given *properties* for this collection's name, then returns the server response.

**Arguments**

* **properties**: `Object` (optional)

  For more information on the *properties* object, see [the HTTP API documentation for creating collections](https://docs.arangodb.com/HttpCollection/Creating.html).

**Examples**

```js
var db = require('arangojs')();
collection = db.collection('potatos');
collection.create(function (err) {
    if (err) return console.error(err);
    // the document collection "potatos" now exists
});

// -- or --

var collection = var collection = db.edgeCollection('friends');
collection.create({
    waitForSync: true // always sync document changes to disk
}, function (err) {
    if (err) return console.error(err);
    // the edge collection "friends" now exists
});
```

#### collection.load

`async collection.load([count]): Object`

Tells the server to load the collection into memory.

**Arguments**

* **count**: `boolean` (Default: `true`)

  If set to `false`, the return value will not include the number of documents in the collection (which may speed up the process).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.load(false, function (err) {
    if (err) return console.error(err);
    // the collection has now been loaded into memory
});
```

#### collection.unload

`async collection.unload(): Object`

Tells the server to remove the collection from memory.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.unload(function (err) {
    if (err) return console.error(err);
    // the collection has now been unloaded from memory
});
```

#### collection.setProperties

`async collection.setProperties(properties): Object`

Replaces the properties of the collection.

**Arguments**

* **properties**: `Object`

  For information on the *properties* argument see [the HTTP API for modifying collections](https://docs.arangodb.com/HttpCollection/Modifying.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.setProperties({waitForSync: true}, function (err, result) {
    if (err) return console.error(err);
    result.waitForSync === true;
    // the collection will now wait for data being written to disk
    // whenever a document is changed
});
```

#### collection.rename

`async collection.rename(name): Object`

Renames the collection. The *Collection* instance will automatically update its name when the rename succeeds.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.rename('new-collection-name', function (err, result) {
    if (err) return console.error(err);
    result.name === 'new-collection-name';
    collection.name === result.name;
    // result contains additional information about the collection
});
```

#### collection.rotate

`async collection.rotate(): Object`

Rotates the journal of the collection.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.rotate(function (err, data) {
    if (err) return console.error(err);
    // data.result will be true if rotation succeeded
});
```

#### collection.truncate

`async collection.truncate(): Object`

Deletes **all documents** in the collection in the database.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.truncate(function (err) {
    if (err) return console.error(err);
    // the collection "some-collection" is now empty
});
```

#### collection.drop

`async collection.drop(): Object`

Deletes the collection from the database.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.drop(function (err) {
    if (err) return console.error(err);
    // the collection "some-collection" no longer exists
});
```

### Manipulating indexes

These functions implement the [HTTP API for manipulating indexes](https://docs.arangodb.com/HttpIndexes/index.html).

#### collection.createIndex

`async collection.createIndex(details): Object`

Creates an arbitrary index on the collection.

**Arguments**

* **details**: `Object`

  For information on the possible properties of the *details* object, see [the HTTP API for manipulating indexes](https://docs.arangodb.com/HttpIndexes/WorkingWith.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.createIndex({type: 'cap', size: 20}, function (err, index) {
    if (err) return console.error(err);
    index.id; // the index's handle
    // the index has been created
});
```

#### collection.createCapConstraint

`async collection.createCapConstraint(size): Object`

Creates a cap constraint index on the collection.

**Arguments**

* **size**: `Object`

  An object with any of the following properties:

  * **size**: `number` (optional)

    The maximum number of documents in the collection.

  * **byteSize**: `number` (optional)

    The maximum size of active document data in the collection (in bytes).

If *size* is a number, it will be interpreted as *size.size*.

For more information on the properties of the *size* object see [the HTTP API for creating cap constraints](https://docs.arangodb.com/HttpIndexes/Cap.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

#### collection.createHashIndex

`async collection.createHashIndex(fields, [opts]): Object`

Creates a hash index on the collection.

**Arguments**

* **fields**: `Array<string>`

  An array of names of document fields on which to create the index. If the value is a string, it will be wrapped in an array automatically.

* **opts**: `Object` (optional)

  Additional options for this index. If the value is a boolean, it will be interpreted as *opts.unique*.

For more information on hash indexes, see [the HTTP API for hash indexes](https://docs.arangodb.com/HttpIndexes/Hash.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

#### collection.createSkipList

`async collection.createSkipList(fields, [opts]): Object`

Creates a skiplist index on the collection.

**Arguments**

* **fields**: `Array<string>`

   An array of names of document fields on which to create the index. If the value is a string, it will be wrapped in an array automatically.

* **opts**: `Object` (optional)

  Additional options for this index. If the value is a boolean, it will be interpreted as *opts.unique*.

For more information on skiplist indexes, see [the HTTP API for skiplist indexes](https://docs.arangodb.com/HttpIndexes/Skiplist.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

#### collection.createGeoIndex

`async collection.createGeoIndex(fields, [opts]): Object`

Creates a geo-spatial index on the collection.

**Arguments**

* **fields**: `Array<string>`

  An array of names of document fields on which to create the index. Currently, geo indexes must cover exactly one field. If the value is a string, it will be wrapped in an array automatically.

* **opts**: `Object` (optional)

  An object containing additional properties of the index.

For more information on the properties of the *opts* object see [the HTTP API for manipulating geo indexes](https://docs.arangodb.com/HttpIndexes/Geo.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

#### collection.createFulltextIndex

`async collection.createFulltextIndex(fields, [minLength]): Object`

Creates a fulltext index on the collection.

**Arguments**

* **fields**: `Array<string>`

  An array of names of document fields on which to create the index. Currently, fulltext indexes must cover exactly one field. If the value is a string, it will be wrapped in an array automatically.

* **minLength** (optional):

  Minimum character length of words to index. Uses a server-specific default value if not specified.

For more information on fulltext indexes, see [the HTTP API for fulltext indexes](https://docs.arangodb.com/HttpIndexes/Fulltext.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

#### collection.index

`async collection.index(indexHandle): Object`

Fetches information about the index with the given *indexHandle* and returns it.

**Arguments**

* **indexHandle**: `string`

  The handle of the index to look up. This can either be a fully-qualified identifier or the collection-specific key of the index. If the value is an object, its *id* property will be used instead.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

#### collection.indexes

`async collection.indexes(): Array<Object>`

Fetches a list of all indexes on this collection.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.createFulltextIndex('description', function (err) {
    if (err) return console.error(err);
    collection.indexes(function (err, indexes) {
        if (err) return console.error(err);
        indexes.length === 1;
        // indexes contains information about the index
    });
});
```

#### collection.dropIndex

`async collection.dropIndex(indexHandle): Object`

Deletes the index with the given *indexHandle* from the collection.

**Arguments**

* **indexHandle**: `string`

  The handle of the index to delete. This can either be a fully-qualified identifier or the collection-specific key of the index. If the value is an object, its *id* property will be used instead.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

### Simple queries

These functions implement the [HTTP API for simple queries](https://docs.arangodb.com/HttpSimpleQuery/index.html).

#### collection.all

`async collection.all([opts]): Cursor`

Performs a query to fetch all documents in the collection. Returns a [new *Cursor* instance](#cursor-api) for the query results.

**Arguments**

* **opts**: `Object` (optional)

  For information on the possible options see [the HTTP API for returning all documents](https://docs.arangodb.com/HttpSimpleQuery/index.html#return-all-documents).

#### collection.any

`async collection.any(): Object`

Fetches a document from the collection at random.

#### collection.first

`async collection.first([opts]): Array<Object>`

Performs a query to fetch the first documents in the collection. Returns an array of the matching documents.

**Arguments**

* **opts**: `Object` (optional)

  For information on the possible options see [the HTTP API for returning the first documents of a collection](https://docs.arangodb.com/HttpSimpleQuery/index.html#first-document-of-a-collection).

  If *opts* is a number it is treated as *opts.count*.

#### collection.last

`async collection.last([opts]): Array<Object>`

Performs a query to fetch the last documents in the collection. Returns an array of the matching documents.

**Arguments**

* **opts**: `Object` (optional)

  For information on the possible options see [the HTTP API for returning the last documents of a collection](https://docs.arangodb.com/HttpSimpleQuery/index.html#last-document-of-a-collection).

  If *opts* is a number it is treated as *opts.count*.

#### collection.byExample

`async collection.byExample(example, [opts]): Cursor`

Performs a query to fetch all documents in the collection matching the given *example*. Returns a [new *Cursor* instance](#cursor-api) for the query results.

**Arguments**

* **example**: *Object*

  An object representing an example for documents to be matched against.

* **opts**: *Object* (optional)

  For information on the possible options see [the HTTP API for fetching documents by example](https://docs.arangodb.com/HttpSimpleQuery/index.html#find-documents-matching-an-example).

#### collection.firstExample

`async collection.firstExample(example): Object`

Fetches the first document in the collection matching the given *example*.

**Arguments**

* **example**: *Object*

  An object representing an example for documents to be matched against.

#### collection.removeByExample

`async collection.removeByExample(example, [opts]): Object`

Removes all documents in the collection matching the given *example*.

**Arguments**

* **example**: *Object*

  An object representing an example for documents to be matched against.

* **opts**: *Object* (optional)

  For information on the possible options see [the HTTP API for removing documents by example](https://docs.arangodb.com/HttpSimpleQuery/index.html#remove-documents-by-example).

#### collection.replaceByExample

`async collection.replaceByExample(example, newValue, [opts]): Object`

Replaces all documents in the collection matching the given *example* with the given *newValue*.

**Arguments**

* **example**: *Object*

  An object representing an example for documents to be matched against.

* **newValue**: *Object*

  The new value to replace matching documents with.

* **opts**: *Object* (optional)

  For information on the possible options see [the HTTP API for replacing documents by example](https://docs.arangodb.com/HttpSimpleQuery/index.html#replace-documents-by-example).

#### collection.updateByExample

`async collection.updateByExample(example, newValue, [opts]): Object`

Updates (patches) all documents in the collection matching the given *example* with the given *newValue*.

**Arguments**

* **example**: *Object*

  An object representing an example for documents to be matched against.

* **newValue**: *Object*

  The new value to update matching documents with.

* **opts**: *Object* (optional)

  For information on the possible options see [the HTTP API for updating documents by example](https://docs.arangodb.com/HttpSimpleQuery/index.html#update-documents-by-example).

#### collection.lookupByKeys

`async collection.lookupByKeys(keys): Array<Object>`

Fetches the documents with the given *keys* from the collection. Returns an array of the matching documents.

**Arguments**

* **keys**: *Array*

  An array of document keys to look up.

#### collection.removeByKeys

`async collection.removeByKeys(keys, [opts]): Object`

Deletes the documents with the given *keys* from the collection.

**Arguments**

* **keys**: *Array*

  An array of document keys to delete.

* **opts**: *Object* (optional)

  For information on the possible options see [the HTTP API for removing documents by keys](https://docs.arangodb.com/HttpSimpleQuery/index.html#remove-documents-by-their-keys).

### Bulk importing documents

This function implements the [HTTP API for bulk imports](https://docs.arangodb.com/HttpBulkImports/index.html).

#### collection.import

`async collection.import(data, [opts]): Object`

Bulk imports the given *data* into the collection.

**Arguments**

* **data**: `Array<Array<any>> | Array<Object>`

  The data to import. This can be an array of documents:

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

* **opts**: `Object` (optional)
  If *opts* is set, it must be an object with any of the following properties:

  * **waitForSync**: `boolean` (Default: `false`)

    Wait until the documents have been synced to disk.

  * **details**: `boolean` (Default: `false`)

    Whether the response should contain additional details about documents that could not be imported.false*.

  * **type**: `string` (Default: `"auto"`)

    Indicates which format the data uses. Can be `"documents"`, `"array"` or `"auto"`.

If *data* is a JavaScript array, it will be transmitted as a line-delimited JSON stream. If *opts.type* is set to `"array"`, it will be transmitted as regular JSON instead. If *data* is a string, it will be transmitted as it is without any processing.

For more information on the *opts* object, see [the HTTP API documentation for bulk imports](https://docs.arangodb.com/HttpBulkImports/ImportingSelfContained.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('users');
collection.import(
    [// document stream
        {username: 'admin', password: 'hunter2'},
        {username: 'jcd', password: 'bionicman'},
        {username: 'jreyes', password: 'amigo'},
        {username: 'ghermann', password: 'zeitgeist'}
    ],
    function (err, result) {
        if (err) return console.error(err);
        result.created === 4;
    }
);
// -- or --
collection.import(
    [// array stream with header
        ['username', 'password'], // keys
        ['admin', 'hunter2'], // row 1
        ['jcd', 'bionicman'], // row 2
        ['jreyes', 'amigo'],
        ['ghermann', 'zeitgeist']
    ],
    function (err, result) {
        if (err) return console.error(err);
        result.created === 4;
    }
);
// -- or --
collection.import(
    (// raw line-delimited JSON array stream with header
        '["username", "password"]\r\n' +
        '["admin", "hunter2"]\r\n' +
        '["jcd", "bionicman"]\r\n' +
        '["jreyes", "amigo"]\r\n' +
        '["ghermann", "zeitgeist"]\r\n'
    ),
    function (err, result) {
        if (err) return console.error(err);
        result.created === 4;
    }
);
```

### Manipulating documents

These functions implement the [HTTP API for manipulating documents](https://docs.arangodb.com/HttpDocument/index.html).

#### collection.replace

`async collection.replace(documentHandle, newValue, [opts]): Object`

Replaces the content of the document with the given *documentHandle* with the given *newValue*.

**Arguments**

* **documentHandle**: `string`

  The handle of the document to replace. This can either be the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

* **newValue**: `Object`

  The new data of the document.

* **opts**: `Object` (optional)

  If *opts* is set, it must be an object with any of the following properties:

  * **waitForSync**: `boolean` (Default: `false`)

    Wait until the document has been synced to disk. Default: `false`.

  * **rev**: `string` (optional)

    Only replace the document if it matches this revision.

  * **policy**: `string` (optional)

    Determines the behaviour when the revision is not matched:

    * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
    * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

#### collection.update

`async collection.update(documentHandle, newValue, [opts]): Object`

Updates (merges) the content of the document with the given *documentHandle* with the given *newValue*.

**Arguments**

* **documentHandle**: `string`

  Handle of the document to update. This can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

* **newValue**: `Object`

  The new data of the document.

* **opts**: `Object` (optional)

  If *opts* is set, it must be an object with any of the following properties:

  * **waitForSync**: `boolean` (Default: `false`)

    Wait until document has been synced to disk.

  * **keepNull**: `boolean` (Default: `true`)

    If set to `false`, properties with a value of `null` indicate that a property should be deleted.

  * **mergeObjects**: `boolean` (Default: `true`)

    If set to `false`, object properties that already exist in the old document will be overwritten rather than merged. This does not affect arrays.

  * **rev**: `string` (optional)

    Only update the document if it matches this revision.

  * **policy**: `string` (optional)

    Determines the behaviour when the revision is not matched:

    * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
    * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
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
```

#### collection.remove

`async collection.remove(documentHandle, [opts]): Object`

Deletes the document with the given *documentHandle* from the collection.

**Arguments**

* **documentHandle**: `string`

  The handle of the document to delete. This can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

* **opts**: `Object` (optional)

  If *opts* is set, it must be an object with any of the following properties:

  * **waitForSync**: `boolean` (Default: `false`)

    Wait until document has been synced to disk.

  * **rev**: `string` (optional)

    Only update the document if it matches this revision.

  * **policy**: `string` (optional)

    Determines the behaviour when the revision is not matched:

    * if *policy* is set to `"last"`, the document will be replaced regardless of the revision.
    * if *policy* is set to `"error"` or not set, the replacement will fail with an error.

For more information on the *opts* object, see [the HTTP API documentation for working with documents](https://docs.arangodb.com/HttpDocument/WorkingWithDocuments.html).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('some-collection');
collection.remove('some-doc', function (err) {
    if (err) return console.error(err);
    // document 'some-collection/some-doc' no longer exists
});
// -- or --
collection.remove('some-collection/some-doc', function (err) {
    if (err) return console.error(err);
    // document 'some-collection/some-doc' no longer exists
});
```

#### collection.list

`async collection.list([type]): Array<string>`

Retrieves a list of references for all documents in the collection.

**Arguments**

* **type**: `string` (Default: `"id"`)

  The format of the document references:

  * if *type* is set to `"id"`, each reference will be the `_id` of the document.
  * if *type* is set to `"key"`, each reference will be the `_key` of the document.
  * if *type* is set to `"path"`, each reference will be the URI path of the document.

### DocumentCollection API

The *DocumentCollection API* extends the [*Collection API* (see above)](#collection-api) with the following methods.

#### documentCollection.document

`async documentCollection.document(documentHandle): Object`

Retrieves the document with the given *documentHandle* from the collection.

**Arguments**

* **documentHandle**: `string`

  The handle of the document to retrieve. This can be either the `_id` or the `_key` of a document in the collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('my-docs');
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
```

#### documentCollection.save

`async documentCollection.save(data): Object`

Creates a new document with the given *data*.

**Arguments**

* **data**: `Object`

  The data of the new document, may include a `_key`.

**Examples**

```js
var db = require('arangojs')();
var collection = db.collection('my-docs');
collection.save(
    {some: 'data'},
    function (err, doc) {
        if (err) return console.error(err);
        doc._key; // the document's key
        doc._id === ('my-docs/' + doc._key);
        doc.some === 'data';
    }
);
```

### EdgeCollection API

The *EdgeCollection API* extends the [*Collection API* (see above)](#collection-api) with the following methods.

#### edgeCollection.edge

`async edgeCollection.edge(documentHandle): Object`

Retrieves the edge with the given *documentHandle* from the collection.

**Arguments**

* **documentHandle**: `string`

  The handle of the edge to retrieve. This can be either the `_id` or the `_key` of an edge in the collection, or an edge (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var db = require('arangojs')();
var collection = var collection = db.edgeCollection('edges');
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
```

#### edgeCollection.save

`async edgeCollection.save(data, [fromId, [toId]]): Object`

Creates a new edge between the documents *fromId* and *toId* with the given *data*.

**Arguments**

* **data**: `Object`

  The data of the new edge. If *fromId* and *toId* are not specified, the *data* needs to contain the properties *_from* and *_to*.

* **fromId**: `string` (optional)

  The handle of the start vertex of this edge. This can be either the `_id` of a document in the database, the `_key` of an edge in the collection, or a document (i.e. an object with an `_id` or `_key` property).

* **toId**: `string` (optional)

  The handle of the end vertex of this edge. This can be either the `_id` of a document in the database, the `_key` of an edge in the collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var db = require('arangojs')();
var collection = db.edgeCollection('edges');
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
// -- or --
collection.save(
    {
        some: 'data',
        _from: 'verticies/start-vertex',
        _to: 'vertices/end-vertex'
    },
    function (err, edge) {
        if (err) return console.error(err);
        // ...
    }
)
```

#### edgeCollection.edges

`async edgeCollection.edges(documentHandle): Array<Object>`

Retrieves a list of all edges of the document with the given *documentHandle*.

**Arguments**

* **documentHandle**: `string`

  The handle of the document to retrieve the edges of. This can be either the `_id` of a document in the database, the `_key` of an edge in the collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var db = require('arangojs')();
var collection = db.edgeCollection('edges');
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
```

#### edgeCollection.inEdges

`async edgeCollection.inEdges(documentHandle): Array<Object>`

Retrieves a list of all incoming edges of the document with the given *documentHandle*.

**Arguments**

* **documentHandle**: `string`

  The handle of the document to retrieve the edges of. This can be either the `_id` of a document in the database, the `_key` of an edge in the collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var db = require('arangojs')();
var collection = db.edgeCollection('edges');
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
```

#### edgeCollection.outEdges

`async edgeCollection.outEdges(documentHandle): Array<Object>`

Retrieves a list of all outgoing edges of the document with the given *documentHandle*.

**Arguments**

* **documentHandle**: `string`

  The handle of the document to retrieve the edges of. This can be either the `_id` of a document in the database, the `_key` of an edge in the collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var db = require('arangojs')();
var collection = db.edgeCollection('edges');
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
```

#### edgeCollection.traversal

`async edgeCollection.traversal(startVertex, opts): Object`

Performs a traversal starting from the given *startVertex* and following edges contained in this edge collection.

**Arguments**

* **startVertex**: `string`

  The handle of the start vertex. This can be either the `_id` of a document in the database, the `_key` of an edge in the collection, or a document (i.e. an object with an `_id` or `_key` property).

* **opts**: `Object`

  See [the HTTP API documentation](https://docs.arangodb.com/HttpTraversal/index.html) for details on the additional arguments.

  Please note that while *opts.filter*, *opts.visitor*, *opts.init*, *opts.expander* and *opts.sort* should be strings evaluating to well-formed JavaScript code, it's not possible to pass in JavaScript functions directly because the code needs to be evaluated on the server and will be transmitted in plain text.

**Examples**

```js
var db = require('arangojs')();
var collection = db.edgeCollection('edges');
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
```

## Graph API

These functions implement the [HTTP API for manipulating graphs](https://docs.arangodb.com/HttpGharial/index.html).

#### graph.get

`async graph.get(): Object`

Retrieves general information about the graph.

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
graph.get(function (err, data) {
    if (err) return console.error(err);
    // data contains general information about the graph
});
```

#### graph.create

`async graph.create(properties): Object`

Creates a graph with the given *properties* for this graph's name, then returns the server response.

**Arguments**

* **properties**: `Object`

  For more information on the *properties* object, see [the HTTP API documentation for creating graphs](https://docs.arangodb.com/HttpGharial/Management.html).

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
graph.create({
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

`async graph.drop([dropCollections]): Object`

Deletes the graph from the database.

**Arguments**

* **dropCollections**: `boolean` (optional)

  If set to `true`, the collections associated with the graph will also be deleted.

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
graph.drop(function (err) {
    if (err) return console.error(err);
    // the graph "some-graph" no longer exists
});
```

### Manipulating vertices

#### graph.vertexCollection

`graph.vertexCollection(collectionName): GraphVertexCollection`

Returns a new [*GraphVertexCollection* instance](#graphvertexcollection-api) with the given name for this graph.

**Arguments**

* **collectionName**: `string`

  Name of the vertex collection.

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
var collection = graph.vertexCollection('vertices');
collection.name === 'vertices';
// collection is a GraphVertexCollection
```

#### graph.addVertexCollection

`async graph.addVertexCollection(collectionName): Object`

Adds the collection with the given *collectionName* to the graph's vertex collections.

**Arguments**

* **collectionName**: `string`

  Name of the vertex collection to add to the graph.

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
graph.addVertexCollection('vertices', function (err) {
    if (err) return console.error(err);
    // the collection "vertices" has been added to the graph
});
```

#### graph.removeVertexCollection

`async graph.removeVertexCollection(collectionName, [dropCollection]): Object`

Removes the vertex collection with the given *collectionName* from the graph.

**Arguments**

* **collectionName**: `string`

  Name of the vertex collection to remove from the graph.

* **dropCollection**: `boolean` (optional)

  If set to `true`, the collection will also be deleted from the database.

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
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
```

### Manipulating edges

#### graph.edgeCollection

`graph.edgeCollection(collectionName): GraphEdgeCollection`

Returns a new [*GraphEdgeCollection* instance](#graphedgecollection-api) with the given name bound to this graph.

**Arguments**

* **collectionName**: `string`

  Name of the edge collection.

**Examples**

```js
var db = require('arangojs')();
// assuming the collections "edges" and "vertices" exist
var graph = db.graph('some-graph');
var collection = graph.edgeCollection('edges');
if (err) return console.error(err);
collection.name === 'edges';
// collection is a GraphEdgeCollection
```

#### graph.addEdgeDefinition

`async graph.addEdgeDefinition(definition): Object`

Adds the given edge definition *definition* to the graph.

**Arguments**

* **definition**: `Object`

  For more information on edge definitions see [the HTTP API for managing graphs](https://docs.arangodb.com/HttpGharial/Management.html).

**Examples**

```js
var db = require('arangojs')();
// assuming the collections "edges" and "vertices" exist
var graph = db.graph('some-graph');
graph.addEdgeDefinition({
    collection: 'edges',
    from: ['vertices'],
    to: ['vertices']
}, function (err) {
    if (err) return console.error(err);
    // the edge definition has been added to the graph
});
```

#### graph.replaceEdgeDefinition

`async graph.replaceEdgeDefinition(collectionName, definition): Object`

Replaces the edge definition for the edge collection named *collectionName* with the given *definition*.

**Arguments**

* **collectionName**: `string`

  Name of the edge collection to replace the definition of.

* **definition**: `Object`

  For more information on edge definitions see [the HTTP API for managing graphs](https://docs.arangodb.com/HttpGharial/Management.html).

**Examples**

```js
var db = require('arangojs')();
// assuming the collections "edges", "vertices" and "more-vertices" exist
var graph = db.graph('some-graph');
graph.replaceEdgeDefinition('edges', {
    collection: 'edges',
    from: ['vertices'],
    to: ['more-vertices']
}, function (err) {
    if (err) return console.error(err);
    // the edge definition has been modified
});
```

#### graph.removeEdgeDefinition

`async graph.removeEdgeDefinition(definitionName, [dropCollection]): Object`

Removes the edge definition with the given *definitionName* form the graph.

**Arguments**

* **definitionName**: `string`

  Name of the edge definition to remove from the graph.

* **dropCollection**: `boolean` (optional)

  If set to `true`, the edge collection associated with the definition will also be deleted from the database.

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
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
```

#### graph.traversal

`async graph.traversal(startVertex, opts): Object`

Performs a traversal starting from the given *startVertex* and following edges contained in any of the edge collections of this graph.

**Arguments**

* **startVertex**: `string`

  The handle of the start vertex. This can be either the `_id` of a document in the graph or a document (i.e. an object with an `_id` property).

* **opts**: `Object`

  See [the HTTP API documentation](https://docs.arangodb.com/HttpTraversal/index.html) for details on the additional arguments.

  Please note that while *opts.filter*, *opts.visitor*, *opts.init*, *opts.expander* and *opts.sort* should be strings evaluating to well-formed JavaScript functions, it's not possible to pass in JavaScript functions directly because the functions need to be evaluated on the server and will be transmitted in plain text.

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
var collection = graph.edgeCollection('edges');
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
```

### GraphVertexCollection API

The *GraphVertexCollection API* extends the [*Collection API* (see above)](#collection-api) with the following methods.

#### graphVertexCollection.vertex

`async graphVertexCollection.vertex(documentHandle): Object`

Retrieves the vertex with the given *documentHandle* from the collection.

**Arguments**

* **documentHandle**: `string`

  The handle of the vertex to retrieve. This can be either the `_id` or the `_key` of a vertex in the collection, or a vertex (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var graph = db.graph('some-graph');
var collection = graph.vertexCollection('vertices');
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
```

#### graphVertexCollection.save

`async graphVertexCollection.save(data): Object`

Creates a new vertex with the given *data*.

**Arguments**

* **data**: `Object`

  The data of the vertex.

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
var collection = graph.vertexCollection('vertices');
collection.save(
    {some: 'data'},
    function (err, doc) {
        if (err) return console.error(err);
        doc._key; // the document's key
        doc._id === ('vertices/' + doc._key);
        doc.some === 'data';
    }
);
```

### GraphEdgeCollection API

The *GraphEdgeCollection API* extends the *Collection API* (see above) with the following methods.

#### graphEdgeCollection.edge

`async graphEdgeCollection.edge(documentHandle): Object`

Retrieves the edge with the given *documentHandle* from the collection.

**Arguments**

* **documentHandle**: `string`

  The handle of the edge to retrieve. This can be either the `_id` or the `_key` of an edge in the collection, or an edge (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var graph = db.graph('some-graph');
var collection = graph.edgeCollection('edges');
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
```

#### graphEdgeCollection.save

`async graphEdgeCollection.save(data, [fromId, [toId]]): Object`

Creates a new edge between the vertices *fromId* and *toId* with the given *data*.

**Arguments**

* **data**: `Object`

  The data of the new edge. If *fromId* and *toId* are not specified, the *data* needs to contain the properties *_from* and *_to*.

* **fromId**: `string` (optional)

  The handle of the start vertex of this edge. This can be either the `_id` of a document in the database, the `_key` of an edge in the collection, or a document (i.e. an object with an `_id` or `_key` property).

* **toId**: `string` (optional)

  The handle of the end vertex of this edge. This can be either the `_id` of a document in the database, the `_key` of an edge in the collection, or a document (i.e. an object with an `_id` or `_key` property).

**Examples**

```js
var db = require('arangojs')();
var graph = db.graph('some-graph');
var collection = graph.edgeCollection('edges');
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
```

# License

The Apache License, Version 2.0. For more information, see the accompanying LICENSE file.
