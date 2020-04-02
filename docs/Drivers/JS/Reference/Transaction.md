# Transaction API

These functions implement the
[HTTP API for transactions](https://www.arangodb.com/docs/stable/http/transaction.html).
Also see [ArangoDB Transactions](https://www.arangodb.com/docs/stable/transactions.html).

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

`async transaction.get(): object`

Retrieves general information about the transaction.

**Examples**

```js
const db = new Database();
const transaction = db.transaction("some-transaction");
const result = await transaction.get();
// result indicates the transaction id and status
```

## transaction.commit

`async transaction.commit(): object`

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

`async transaction.abort(): object`

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
  only the code up to and including the first await will run in the transaction.
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

// TODO add complex example to demonstrate common mistake and how to fix
// See https://stackoverflow.com/questions/59844658/trx/59860187

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
