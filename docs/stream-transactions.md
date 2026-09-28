# Stream transactions in arangojs

This guide explains how to use stream transactions in arangojs, including the
backward-compatible `step` API and the opt-in async-context APIs introduced for
DE-10.

## Contents

- [Overview](#overview)
- [Choosing an API](#choosing-an-api)
- [Quick start](#quick-start)
- [Async transaction steps](#async-transaction-steps)
- [Managed transactions](#managed-transactions)
- [Concurrency](#concurrency)
- [Node.js and browser behavior](#nodejs-and-browser-behavior)
- [Usage rules](#usage-rules)
- [Migration](#migration)
- [Troubleshooting](#troubleshooting)
- [API summary](#api-summary)

## Overview

A stream transaction is opened with `Database#beginTransaction`. Requests take
part in the transaction when they include the `x-arango-trx-id` HTTP header.
The transaction remains open until it is committed, aborted, or expires on the
server.

```js
const collection = db.collection("orders");
const trx = await db.beginTransaction(collection);

try {
  await trx.step(() => collection.save({ _key: "order-1" }));
  await trx.commit();
} catch (error) {
  await trx.abort().catch(() => undefined);
  throw error;
}
```

arangojs provides two step behaviors:

- `step` preserves the historical behavior. It is suitable for wrapping one
  arangojs request that is started synchronously by the callback.
- `stepAsync` is an explicit opt-in. It keeps transaction context associated
  with the callback until the returned Promise settles, including across
  `await` and `.then()` continuations.

The corresponding managed helpers are `withTransaction` and
`withTransactionAsync`.

## Choosing an API

| Need                                                              | API                        |
| ----------------------------------------------------------------- | -------------------------- |
| Preserve existing application behavior                            | `step` / `withTransaction` |
| Wrap one immediately started arangojs request                     | Either API                 |
| Await non-database work before a database call                    | `stepAsync`                |
| Make multiple sequential database calls in one step               | `stepAsync`                |
| Run different transactions concurrently on one Node.js `Database` | `stepAsync`                |
| Automatically commit or abort with legacy step behavior           | `withTransaction`          |
| Automatically commit or abort with async-context steps            | `withTransactionAsync`     |

Existing code is not migrated automatically. Use the new methods only where
the async-context behavior is needed.

## Quick start

### Manual transaction with legacy steps

```js
const orders = db.collection("orders");
const trx = await db.beginTransaction(orders);

try {
  await trx.step(() => orders.save({ _key: "a", total: 10 }));
  await trx.step(() => orders.save({ _key: "b", total: 20 }));
  await trx.commit();
} catch (error) {
  await trx.abort().catch(() => undefined);
  throw error;
}
```

Each legacy step should initiate exactly one asynchronous arangojs operation.

### Manual transaction with an async step

```js
const orders = db.collection("orders");
const trx = await db.beginTransaction(orders);

try {
  const order = await trx.stepAsync(async () => {
    const input = await loadOrderFromExternalService();
    const saved = await orders.save(input);
    await orders.update(saved, { validated: true });
    return saved;
  });

  await trx.commit();
  console.log(order._key);
} catch (error) {
  await trx.abort().catch(() => undefined);
  throw error;
}
```

Both database calls remain associated with the transaction because the
callback returns the Promise representing all of its work.

## Async transaction steps

### Why `step` cannot cover arbitrary async callbacks

The historical `step` implementation sets one transaction ID on the
connection, invokes the callback, and clears the ID when the callback returns.
An async function returns a Promise at its first `await`, before the rest of its
body finishes.

```js
await trx.step(async () => {
  await delay(50);
  return collection.save({ _key: "late" });
});
```

The save above starts after the legacy transaction ID has been cleared. It is
not guaranteed to be rolled back by `trx.abort()`. This behavior remains
unchanged for backward compatibility.

### `stepAsync` behavior

`stepAsync` associates the transaction ID with the callback's asynchronous
execution until its returned Promise resolves or rejects:

```js
await trx.stepAsync(async () => {
  await delay(50);
  return collection.save({ _key: "late" });
});

await trx.abort(); // "late" is rolled back
```

Promise chains are supported as well:

```js
await trx.stepAsync(() =>
  loadConfiguration().then((config) => collection.save(config.document)),
);
```

Multiple operations can be performed sequentially:

```js
await trx.stepAsync(async () => {
  const first = await collection.save({ _key: "first" });
  const second = await collection.save({ _key: "second" });
  return { first, second };
});
```

The resolved callback value is returned by `stepAsync` with its TypeScript
generic type preserved.

### Callback failures

The callback must return a Promise. A synchronous exception or rejected Promise
rejects `stepAsync`, and its transaction context is released.

```js
await trx.stepAsync(async () => {
  await collection.save(document);
  throw new Error("validation failed");
});
```

This rejects the step, but it does not automatically abort the server
transaction. Call `abort()` in a `catch` block or use
`withTransactionAsync()`.

## Managed transactions

`withTransactionAsync` begins a transaction, supplies a bound `stepAsync`
function, commits when the callback resolves, and attempts to abort when the
callback rejects.

```js
const result = await db.withTransactionAsync(
  { write: [orders, inventory] },
  async (stepAsync) => {
    return stepAsync(async () => {
      const order = await orders.save(orderData);
      await inventory.update(itemKey, { reserved: true });
      return order;
    });
  },
);
```

Only work inside `stepAsync` is transaction-scoped. The outer managed callback
is not itself an implicit transaction context:

```js
await db.withTransactionAsync(collection, async (stepAsync) => {
  await doNonDatabaseWork();
  await stepAsync(() => collection.save(document));
});
```

The existing `withTransaction` helper continues to supply the legacy `step`
function.

## Concurrency

### Different transactions on one Node.js Database

Different transactions can run concurrently when every overlapping step uses
`stepAsync`:

```js
const trx1 = await db.beginTransaction(collection);
const trx2 = await db.beginTransaction(collection);

await Promise.all([
  trx1.stepAsync(async () => {
    await delay(50);
    return collection.save({ _key: "from-trx-1" });
  }),
  trx2.stepAsync(() => collection.save({ _key: "from-trx-2" })),
]);

await trx1.commit();
await trx2.commit();
```

Node.js keeps the IDs in independent async contexts. A normal request running
concurrently outside those contexts does not inherit either transaction ID.

Server-side locking and transaction limits still apply. Client-side context
isolation does not guarantee that every pair of server operations can execute
in parallel without waiting.

### Steps of the same transaction

Always await steps of the same server transaction sequentially:

```js
await trx.stepAsync(() => collection.save(first));
await trx.stepAsync(() => collection.save(second));
```

Do not use `Promise.all` for multiple steps belonging to one transaction. A
stream transaction may not support simultaneous operations and can return a
"transaction is already in use" error.

### Nested transactions

On Node.js, a new stream transaction can be started inside the `stepAsync`
callback of another transaction. The inner transaction is independent: it has
its own ID, and committing or aborting it does not commit or abort the outer
transaction. After the inner operation settles, subsequent requests in the
callback resume using the outer transaction context.

This context restoration applies at every level, so an outer transaction can
run multiple inner transactions sequentially, and an inner transaction can
itself contain another transaction. Each transaction has an independent ID and
lifecycle. Use separate collections where possible to avoid server-side lock
contention between the active transactions.

```js
const outer = await db.beginTransaction(outerCollection);

await outer.stepAsync(async () => {
  await outerCollection.save({ _key: "outer-before" });

  const inner = await db.beginTransaction(innerCollection);
  try {
    await inner.stepAsync(() =>
      innerCollection.save({ _key: "inner-document" }),
    );
    await inner.commit();
  } catch (error) {
    await inner.abort().catch(() => undefined);
    throw error;
  }

  // Uses the outer transaction again.
  await outerCollection.save({ _key: "outer-after" });
});

await outer.abort();
// The inner document remains committed. Both outer documents are rolled back.
```

These are two separate server transactions, not database-style savepoints. Use
`stepAsync` for the inner transaction and consider server locking when both
transactions access the same collections. Browsers support only one active
new-style step per connection, so nested transactions on the same connection
are rejected there.

### Do not mix step modes concurrently

Do not overlap legacy `step`/`withTransaction` work with
`stepAsync`/`withTransactionAsync` work on the same underlying connection. The
legacy API uses connection-global state, while the new API uses scoped state.

Sequential use is safe after the previous step and transaction have completed.

## Node.js and browser behavior

### Node.js

On supported Node.js versions, arangojs uses `AsyncLocalStorage` from
`node:async_hooks`. The stored context includes both the transaction ID and the
owning connection. This provides:

- propagation across `await`, Promise chains, and timers;
- isolation between concurrent request handlers;
- isolation from normal non-transactional work;
- protection against applying a transaction ID to a different connection.

If async context cannot be initialized in a Node.js runtime, `stepAsync`
rejects instead of silently running with weaker concurrency guarantees.

### Browsers

Browsers do not provide `AsyncLocalStorage`. arangojs keeps one new-style
transaction ID per connection until the step Promise settles.

- Async work in one `stepAsync` is supported.
- Overlapping async steps on the same connection are rejected.
- For concurrent transactions, use independently constructed `Database`
  instances so they own different connections.

A database handle derived from another `Database` can share its connection and
does not provide concurrency isolation merely because it is a different object.

## Usage rules

### Return all asynchronous work

The context lifetime follows the Promise returned by the callback:

```js
// Wrong: the callback resolves before save finishes.
await trx.stepAsync(async () => {
  collection.save(document);
});

// Correct:
await trx.stepAsync(() => collection.save(document));

// Also correct:
await trx.stepAsync(async () => {
  await collection.save(document);
});
```

### Declare all collections

Collections used by the transaction must follow ArangoDB's stream transaction
collection rules:

```js
const trx = await db.beginTransaction({
  read: [customers],
  write: [orders, inventory],
});
```

Async context propagation does not bypass server validation.

### End every manual transaction

Always call `commit()` or `abort()` for a manually created transaction. Prefer
`withTransactionAsync` when automatic cleanup is appropriate.

### Keep long external work in mind

External calls inside a step keep the stream transaction open. The server's
idle timeout, lock duration, and resource usage still apply. Avoid holding a
transaction open longer than necessary.

## Migration

### Existing one-request-per-step code

No migration is required:

```js
await trx.step(() => collection.save(first));
await trx.step(() => collection.save(second));
```

You may switch to `stepAsync` later, but there is no automatic behavior change.

### Async callbacks that currently leak

Change only the affected step:

```diff
- await trx.step(async () => {
+ await trx.stepAsync(async () => {
    await prepareData();
    await collection.save(first);
    return collection.save(second);
  });
```

Verify whether old leaked writes already influenced surrounding application
logic. With `stepAsync`, aborting now rolls those writes back.

### Managed transaction callbacks

Use the matching helper:

```diff
- await db.withTransaction(collection, async (step) => {
-   await step(async () => {
+ await db.withTransactionAsync(collection, async (stepAsync) => {
+   await stepAsync(async () => {
      await prepareData();
      return collection.save(document);
    });
  });
```

Migration can be incremental. Do not run old and new modes concurrently on the
same connection during a partial migration.

## Troubleshooting

### A write survives abort

- Confirm the call is inside `stepAsync`, not `step`.
- Confirm the callback returns or awaits the database operation.
- Confirm all helper functions return their Promises.
- Confirm the write uses the same connection as the transaction.

### Browser reports concurrent async steps

Wait for the active step to settle before starting another one, serialize the
transaction workflows, or use independently constructed `Database` instances.

### Transaction not found or already expired

The server may have expired an idle transaction, or a cluster/load-balancing
configuration may require adjustment. Review server transaction timeouts and
the `poolSize` guidance in the main README.

### Transaction is already in use

Check for parallel operations in the same server transaction. Await its steps
and database requests sequentially.

## API summary

| API                                                        | Description                                     |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `db.beginTransaction(collections, options?)`               | Begins a stream transaction                     |
| `db.transaction(id)`                                       | Creates a handle for an existing transaction    |
| `trx.step(callback)`                                       | Legacy synchronous-invocation transaction scope |
| `trx.stepAsync(callback)`                                  | Opt-in Promise-lifetime transaction scope       |
| `db.withTransaction(collections, callback, options?)`      | Managed transaction using legacy steps          |
| `db.withTransactionAsync(collections, callback, options?)` | Managed transaction using async-context steps   |
| `trx.get()` / `trx.exists()`                               | Reads transaction state                         |
| `trx.commit()`                                             | Commits a transaction                           |
| `trx.abort()`                                              | Aborts a transaction                            |

For server guarantees and limitations, see the ArangoDB stream transaction
documentation for the server version you use.
