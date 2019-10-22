# Transactions

These functions implement the
[HTTP API for JS transactions](https://www.arangodb.com/docs/stable/http/transaction-js-transaction.html).
Also see [ArangoDB Transactions](https://www.arangodb.com/docs/stable/transactions.html).

## database.executeTransaction

`async database.executeTransaction(collections, action, [options]): Object`

Performs a server-side transaction and returns its return value.

**Arguments**

- **collections**: `Object`

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

- **options**: `Object` (optional)

  An object with any of the following properties:

  - **params**: `any` (optional)

    Available as the first argument to the _action_ function when it is executed on the
    server. Check the example below.

  - **lockTimeout**: `number` (optional)

    Determines how long the database will wait while attempting to gain locks on
    collections used by the transaction before timing out.

  - **waitForSync**: `boolean` (optional)

    Determines whether to force the transaction to write all data to disk before returning.

  - **maxTransactionSize**: `number` (optional)

    Determines the transaction size limit in bytes. Honored by the RocksDB storage engine only.

  - **intermediateCommitCount**: `number` (optional)

    Determines the maximum number of operations after which an intermediate commit is
    performed automatically. Honored by the RocksDB storage engine only.

  - **intermediateCommitSize**: `number` (optional)

    Determine the maximum total size of operations after which an intermediate commit is
    performed automatically. Honored by the RocksDB storage engine only.

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

Returns a `Transaction` instance for an existing transaction with the given
_id_.

{% hint 'warning' %}
For backwards-compatibility with arangojs 6.10 and earlier, this method will
behave like _executeTransaction_ when passed the following arguments:

- **collections**: `Object`

  See _collections_ in _executeTransaction_.

- **action**: `string`

  See _action_ in _executeTransaction_.

- **params**: `any` (optional)

  See _options.params_ in _executeTransaction_.

- **options**: `Object` (optional)

  See _options_ in _executeTransaction_.

If _params_ or _options_ is a `number`, it will be treated as
_options.lockTimeout_.

This behavior is deprecated and will be removed in arangojs 7.
{% endhint %}

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

`async database.beginTransaction(collections, [options]): Transaction`

Begins a new streaming transaction for the given collections, then returns a
`Transaction` instance for the transaction.

**Arguments**

- **collections**: `Object`

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

- **options**: `Object` (optional)

  An object with the following properties:

  - **lockTimeout**: `number` (optional)

    Determines how long the database will wait while attempting to gain locks on
    collections used by the transaction before timing out.

  - **waitForSync**: `boolean` (optional)

    Determines whether to force the transaction to write all data to disk before returning.

  - **maxTransactionSize**: `number` (optional)

    Determines the transaction size limit in bytes. Honored by the RocksDB storage engine only.

  - **intermediateCommitCount**: `number` (optional)

    Determines the maximum number of operations after which an intermediate commit is
    performed automatically. Honored by the RocksDB storage engine only.

  - **intermediateCommitSize**: `number` (optional)

    Determine the maximum total size of operations after which an intermediate commit is
    performed automatically. Honored by the RocksDB storage engine only.

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

## transaction.exists

`async transaction.exists(): boolean`

Checks whether the transaction exists.

**Examples**

```js
const db = new Database();
const transaction = db.transaction("some-transaction");
const result = await transaction.exists();
// result indicates whether the transaction exists
```

## transaction.get

`async transaction.get(): Object`

Retrieves general information about the transaction.

**Examples**

```js
const db = new Database();
const transaction = db.transaction("some-transaction");
const result = await transaction.get();
// result indicates the transaction id and status
```

## transaction.commit

`async transaction.commit(): Object`

Attempts to commit the transaction to the database, then returns an object
indicating the transaction's id and updated status.

**Examples**

```js
const db = new Database();
const transaction = db.transaction("some-transaction");
const result = await transaction.commit();
// result indicates the transaction id and updated status
```

## transaction.abort

`async transaction.abort(): Object`

Attempts to abort the transaction in the database, then returns an object
indicating the transaction's id and updated status.

**Examples**

```js
const db = new Database();
const transaction = db.transaction("some-transaction");
const result = await transaction.abort();
// result indicates the transaction id and updated status
```

## transaction.run

`async transaction.run(fn): any`

Executes the given function locally within the transaction and returns a promise
for its result.

**Arguments**

- **fn**: `Function`

  A function to be executed locally as part of the transaction.

  {% hint 'warning' %}
  If the given function contains asynchronous logic, only the synchronous part
  of the function will be run in the transaction. E.g. when using async/await
  only the code up to the first await will run in the transaction.
  Pay attention to the examples below.
  {% endhint %}

Unlike _executeTransaction_, functions passed to _run_ will be executed locally
on the client, not on the server.

**Examples**

```js
const col1 = db.collection(name1);
const col2 = db.collection(name2);
const trx = await db.beginTransaction(collections);

// The following code will run in the transaction
const meta1 = await trx.run(() => col1.save({ data: "doc1" }));
const meta2 = await trx.run(() => col1.save({ data: "doc2" }));

// Results from preceding actions can be used normally
await trx.run(() =>
  col2.save({ _from: meta1._id, to: meta2._id, data: "edge1" })
);

// Promise.all can be used to run multiple actions in parallel
await Promise.all([
  trx.run(() => col2.save({ _from: meta1._id, _to: meta2._id, data: "edge2" })),
  trx.run(() => col2.save({ _from: meta1._id, _to: meta2._id, data: "edge3" }))
]);
await trx.run(() =>
  Promise.all([
    col2.save({ _from: meta1._id, _to: meta2._id, data: "edge4" }),
    col2.save({ _from: meta1._id, _to: meta2._id, data: "edge5" })
  ])
);

// DANGER! The following examples demonstrate common mistakes!

await trx.run(async () => {
  // The first line runs in the transaction
  await col1.save({ data: "doc3" });
  // The next line will run outside the transaction because it comes
  // after the first await and is executed asynchronously!
  await col1.save({ data: "doc4" });
});

await trx.run(() =>
  // The first line runs in the transaction
  col1
    .save({ data: "doc5" })
    // The next line will run outside the transaction because
    // it is executed in an asynchronous callback!
    .then(() => col1.save({ data: "doc6" }))
);

// While not an error, wrapping synchronous methods in "run" is unnecessary.
await trx.run(() => db.collection(name1));

await trx.run(() => {
  // This method returns a promise but we forget to return it. Note that the
  // request will still be executed, we just don't know when/if it completed.
  col1.save({ data: "doc7" });
});

// Remember to always wait for all actions to resolve before committing.
// The following line is missing the "await" and creates a race condition.
trx.run(() => col1.save({ data: "doc8" }));

// All actions run as part of a stream transaction will only take effect if
// the transaction is committed. Make sure to always call "commit" or "abort".
await trx.commit();
```
