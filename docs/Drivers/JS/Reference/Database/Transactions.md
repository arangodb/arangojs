# Transactions

These functions implement the
[HTTP API for transactions](https://www.arangodb.com/docs/stable/http/transaction.html)
and the
[HTTP API for JS transactions](https://www.arangodb.com/docs/stable/http/transaction-js-transaction.html).
Also see [ArangoDB Transactions](https://www.arangodb.com/docs/stable/transactions.html).

## database.executeTransaction

`async database.executeTransaction(collections, action, options?): any`

Performs a server-side transaction and returns its return value.

**Arguments**

- **collections**: `object`

  An object with the following properties:

  - **read**: `Array<string | Collection> | string | Collection` (optional)

    An array of names (or a single name) of collections, or an array of
    `Collection` instances (or a single `Collection` instance), that will be
    read from during the transaction.

  - **write**: `Array<string | Collection> | string | Collection` (optional)

    An array of names (or a single name) of collections, or an array of
    `Collection` instances (or a single `Collection` instance), that will be
    written to or read from during the transaction.

    If ArangoDB is using the RocksDB storage engine, write access to the
    collections will be shared, i.e. other writes to the collections may run in
    parallel.

    If ArangoDB is using the MMFiles engine, this option is synonymous with
    _collections.exclusive_, i.e. no other writes will run in parallel.

  - **exclusive**: `Array<string | Collection> | string | Collection` (optional)

    An array of names (or a single name) of collections, or an array of
    `Collection` instances (or a single `Collection` instance), that will be
    written to or read from during the transaction. Write access will be
    exclusive to the collection, i.e. no other writes will be run in parallel.

- **action**: `string`

  A string evaluating to a JavaScript function to be executed on the server.

  {% hint 'warning ' %}
  This function will be executed on the server inside ArangoDB and can not use
  the arangojs driver or any values other than those passed as _params_.
  For accessing the database from within ArangoDB, see the documentation for the
  [`@arangodb` module in ArangoDB](https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html).
  {% endhint %}

- **options**: `object` (optional)

  An object with any of the following properties:

  - **params**: `any` (optional)

    Arbitrary value passed as the first argument to the _action_ function when
    it is executed on the server. Must be serializable to JSON.

  - **lockTimeout**: `number` (optional)

    Determines how long the database will wait while attempting to gain locks on
    collections used by the transaction before timing out.

  - **waitForSync**: `boolean` (optional)

    Determines whether to force the transaction to write all data to disk
    before returning.

  If ArangoDB is using the RocksDB storage engine, the object has the following
  additional properties:

  - **maxTransactionSize**: `number` (optional)

    Determines the transaction size limit in bytes.

  - **intermediateCommitCount**: `number` (optional)

    Determines the maximum number of operations after which an intermediate
    commit is performed automatically.

  - **intermediateCommitSize**: `number` (optional)

    Determine the maximum total size of operations after which an intermediate
    commit is performed automatically.

If _collections_ is an array, string or `Collection`, it will be treated as
_collections.write_.

Please note that while _action_ should be a string evaluating to a well-formed
JavaScript function, it's not possible to pass in a JavaScript function directly
because the function needs to be evaluated on the server and will be transmitted
in plain text.

**Examples**

```js
const db = new Database();

const action = String(function(params) {
  // This code will be executed inside ArangoDB!
  const { query } = require("@arangodb");
  return query`
      FOR user IN _users
      FILTER user.age > ${params.age}
      RETURN u.user
    `.toArray();
});

const result = await db.executeTransaction("_users", action, {
  params: { age: 12 }
});
// result contains the return value of the action
```

## database.transaction

`database.transaction(id): Transaction`

Returns a `Transaction` instance for an existing streaming transaction with the
given _id_.

- **id**: `string`

  The _id_ of an existing stream transaction.

**Examples**

```js
const trx1 = await db.beginTransaction(collections);
const id = trx1.id;
// later
const trx2 = db.transaction(id);
await trx2.commit();
```

## database.beginTransaction

`async database.beginTransaction(collections, options?): Transaction`

Begins a new streaming transaction for the given collections, then returns a
`Transaction` instance for the transaction.

**Arguments**

- **collections**: `object`

  An object with the following properties:

  - **read**: `Array<string | Collection> | string | Collection` (optional)

    An array of names (or a single name) of collections, or an array of
    `Collection` instances (or a single `Collection` instance), that will be
    read from during the transaction.

  - **write**: `Array<string | Collection> | string | Collection` (optional)

    An array of names (or a single name) of collections, or an array of
    `Collection` instances (or a single `Collection` instance), that will be
    written to or read from during the transaction.

    If ArangoDB is using the RocksDB storage engine, write access to the
    collections will be shared, i.e. other writes to the collections may run in
    parallel.

    If ArangoDB is using the MMFiles engine, this option is synonymous with
    _collections.exclusive_, i.e. no other writes will run in parallel.

  - **exclusive**: `Array<string | Collection> | string | Collection` (optional)

    An array of names (or a single name) of collections, or an array of
    `Collection` instances (or a single `Collection` instance), that will be
    written to or read from during the transaction. Write access will be
    exclusive to the collection, i.e. no other writes will be run in parallel.

- **options**: `object` (optional)

  An object with the following properties:

  - **lockTimeout**: `number` (optional)

    Determines how long the database will wait while attempting to gain locks on
    collections used by the transaction before timing out.

  - **waitForSync**: `boolean` (optional)

    Determines whether to force the transaction to write all data to disk before returning.

  If ArangoDB is using the RocksDB storage engine, the object has the following
  additional properties:

  - **maxTransactionSize**: `number` (optional)

    Determines the transaction size limit in bytes.

  - **intermediateCommitCount**: `number` (optional)

    Determines the maximum number of operations after which an intermediate
    commit is performed automatically.

  - **intermediateCommitSize**: `number` (optional)

    Determine the maximum total size of operations after which an intermediate
    commit is performed automatically.

If _collections_ is an array, string or `Collection`, it will be treated as
_collections.write_.

**Examples**

```js
const vertices = db.collection("vertices");
const edges = db.collection("edges");
const trx = await db.beginTransaction({
  read: ["vertices"],
  write: [edges] // collection instances can be passed directly
});
const start = await trx.run(() => vertices.document("a"));
const end = await trx.run(() => vertices.document("b"));
await trx.run(() => edges.save({ _from: start._id, _to: end._id }));
await trx.commit();
```
