# Transactions

These functions implement the
[HTTP API for transactions](https://docs.arangodb.com/latest/HTTP/Transaction/index.html).
Also see [ArangoDB Transactions](https://docs.arangodb.com/latest/Manual/Transactions/index.html).

## database.executeTransaction

`async database.executeTransaction(collections, action, [options]): Object`

Performs a server-side transaction and returns its return value.

**Arguments**

- **collections**: `Object`

  An object with the following properties:

  - **read**: `Array<string>` (optional)

    An array of names (or a single name) of collections that will be read from
    during the transaction.

  - **write**: `Array<string>` (optional)

    An array of names (or a single name) of collections that will be written to
    or read from during the transaction. Write access to the collection will be
    shared if the RocksDB storage engine is used, i.e. other writes to the
    collection may run in parallel. It will acquire collection-level locks in
    the MMFiles engine and is therefore synonymous with _exclusive_.

  - **exclusive**: `Array<string>` (optional)

    An array of names (or a single name) of collections that will be written to
    or read from during the transaction. Write access will be exclusive to the
    collection, i.e. no other writes will be run in parallel.

- **action**: `string`

  A string evaluating to a JavaScript function to be executed on the server.

  {% hint 'warning ' %}
  This function will be executed on the server inside ArangoDB and can not use
  the arangojs driver or any values other than those passed as _params_.
  For accessing the database from within ArangoDB, see the documentation for the
  [`@arangodb` module in ArangoDB](https://docs.arangodb.com/latest/Manual/Appendix/JavaScriptModules/ArangoDB.html).
  {% endhint %}

- **options**: `Object` (optional)

  An object with any of the following properties:

  - **params**: `Object` (optional)

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

If _collections_ is an array or string, it will be treated as
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

- **id**: `string`

## database.beginTransaction

`async database.beginTransaction(collections, [options]): Transaction`

- **collections**: `Object`

- **options**: `Object` (optional)

## transaction.get

`async transaction.get(): Object`

## transaction.commit

`async transaction.commit(): Object`

## transaction.abort

`async transaction.abort(): Object`

## transaction.run

`async transaction.run(fn): any`

Executes the given function locally within the transaction and returns a promise
for its result.

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
