# DE-10 Review Stream Transactions in Javascript driver

## 1. Issue

**In short:** Stream transaction callbacks that use async/await or Promises can cause some database operations to run **outside** the transaction. Those operations are not rolled back on `trx.abort()`, which is counterintuitive and error-prone.

More concretely:

- Callbacks passed to `trx.step()` (or the older `trx.run()`) may be **async** or return a **Promise** that performs DB work later (e.g. after an `await` or inside a `.then()`).
- In that case, only the **synchronous part** of the callback (up to the first `await` or return of a Promise) runs while the driver considers the step "in" the transaction.
- Any **subsequent** DB operations run after the driver has already cleared the transaction context, so they are sent **without** the transaction header and are **not** part of the transaction.
- **Result:** `trx.abort()` does not roll back those operations; data can persist when the user expects a full rollback.

**Example of the current (broken) behaviour:**

```js
const trx = await db.beginTransaction(collection);

await trx.step(async () => {
  await someAsyncWork();                    // callback returns here; driver clears transaction ID
  return collection.save({ _key: "x" });   // runs LATER -> no transaction header -> not in transaction
});

await trx.abort();  // the save above is NOT rolled back
```

## 2. Root cause analysis (technical)

- **Single transaction ID per connection:** The driver holds one `_transactionId` on the `Connection`. Every outgoing HTTP request that should run in a transaction adds the header `x-arango-trx-id` only when this field is set (`src/connection.ts`).
- **`step()` clears the ID in synchronous `finally`:** In `Transaction#step(callback)` we call `conn.setTransactionId(this.id)`, invoke `callback()`, then in a **synchronous `finally`** block call `conn.clearTransactionId()`, and return the Promise from the callback. So the ID is cleared **as soon as the callback returns**, not when the returned Promise settles.
- **Async callback "returns" at first `await`:** An async function (or a function that returns a Promise) returns as soon as it hits the first `await` or returns a thenable. The rest of the work (including any DB calls) runs in a later microtask/tick. By then, `finally` has already run and `_transactionId` is `null`.
- **Requests sent without the header:** When `collection.save()` (or any arangojs method) eventually runs, it calls `request()`. At that time the connection no longer has a transaction ID, so the request is sent **without** `x-arango-trx-id` and the server does not associate it with the transaction. Hence those operations are not rolled back on abort.

**Summary:** Clearing the transaction ID in synchronous `finally` (tied to callback return) instead of when the step's Promise settles is the root cause. Any DB operation that runs after the callback has returned is executed outside the transaction.

---

## 3. What we are fixing

We will change the driver so that the transaction ID is **not** cleared in a synchronous `finally` when the callback returns. Instead, we will clear it only when the **Promise returned by the callback** has **settled** (resolved or rejected), e.g. by attaching `.finally(() => conn.clearTransactionId())` to that Promise.

So:

- Any async work you do **inside** a single `trx.step(...)` (including DB calls after `await` or in `.then()`) will run **while** the transaction ID is still set.
- All those requests will be sent **with** the transaction header and will be part of the same transaction.
- After the fix, `trx.abort()` will correctly roll back everything that happened in that step.

**Example after the fix:**

```js
const trx = await db.beginTransaction(collection);

// After fix: driver keeps transaction ID until this Promise settles.
await trx.step(async () => {
  await someAsyncWork();                    // still in transaction
  return collection.save({ _key: "x" });   // also in transaction
});

await trx.abort();  // the save above WILL be rolled back
```

No API changes: same `trx.step(callback)` signature. This is a behavioural fix for the async case.

---

## 4. What clients CAN do (supported)

- **One transaction, sequential steps (including async inside a step)**  
  Use `trx.step()` multiple times, one after the other. You can use async/await or Promises inside a single step; the driver will wait until that step’s Promise settles and will keep all those operations in the transaction.

  ```js
  const trx = await db.beginTransaction(collection);
  await trx.step(() => collection.save({ _key: "a" }));
  await trx.step(async () => {
    await externalApiCall();
    return collection.save({ _key: "b" });
  });
  await trx.commit();
  ```

- **Multiple DB calls in one step**  
  A single step can do several arangojs calls (e.g. multiple `await collection.save(...)`); they will all run in the same transaction.

  ```js
  await trx.step(async () => {
    const a = await collection.save({ _key: "a" });
    const b = await collection.save({ _key: "b" });
    return collection.document("a");
  });
  ```

- **Multiple transactions one after the other**  
  Start a transaction, commit or abort it, then start another. As long as they don’t overlap on the same connection, this is fine.

---

## 5. What clients should NOT do (limitation)

- **Do not run two stream transactions at the same time on the same `Database` (same connection).**

  The connection has only one “current” transaction ID. If two requests (e.g. two API endpoints) each start a transaction and run steps at the same time using the **same** `db` instance, they will overwrite each other’s transaction ID and requests can end up in the wrong transaction or outside any transaction. Behaviour is then unpredictable (e.g. aborts not rolling back what you expect).

  **Example of what to avoid:**

  ```js
  const db = new Database(config);  // single shared db

  app.post("/endpoint1", async (req, res) => {
    const trx1 = await db.beginTransaction(collection);
    await trx1.step(() => collection.save({ _key: "from-1" }));
    await trx1.commit();
    res.json({ ok: true });
  });

  app.post("/endpoint2", async (req, res) => {
    const trx2 = await db.beginTransaction(collection);
    await trx2.step(() => collection.save({ _key: "from-2" }));
    await trx2.commit();
    res.json({ ok: true });
  });
  // If both endpoints are called at the same time → undefined behaviour.
  ```

  **What to do instead when you have concurrent requests that each use a transaction:**

  1. **One Database per request (when that request uses a transaction):** Create a new `Database(config)` per request and call `db.close()` in `finally`. Each request then has its own connection and its own transaction ID.
  2. **Pool of Database instances:** Use a pool of `Database` instances; acquire one for the duration of the transaction and release it when done.
  3. **Serialize:** Use a mutex (or queue) so only one transaction runs at a time on the shared `db`.

  We will document this limitation and these patterns in the driver docs when we ship the fix.

