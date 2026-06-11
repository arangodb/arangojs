/**
 * ```ts
 * import type { Transaction } from "arangojs/transactions";
 * ```
 *
 * The "transactions" module provides transaction related types and interfaces
 * for TypeScript.
 *
 * @packageDocumentation
 */
import * as collections from "./collections.js";
import * as databases from "./databases.js";
import * as errors from "./errors.js";
import { runTransactionStep } from "./lib/transaction-context.js";
import { TRANSACTION_NOT_FOUND } from "./lib/codes.js";

//#region Transaction operation options
/**
 * Collections involved in a transaction.
 */
export type TransactionCollectionOptions = {
  /**
   * An array of collections or a single collection that will be read from or
   * written to during the transaction with no other writes being able to run
   * in parallel.
   */
  exclusive?:
    | (string | collections.ArangoCollection)[]
    | string
    | collections.ArangoCollection;
  /**
   * An array of collections or a single collection that will be read from or
   * written to during the transaction.
   */
  write?:
    | (string | collections.ArangoCollection)[]
    | string
    | collections.ArangoCollection;
  /**
   * An array of collections or a single collection that will be read from
   * during the transaction.
   */
  read?:
    | (string | collections.ArangoCollection)[]
    | string
    | collections.ArangoCollection;
};

/**
 * @internal
 */
export function coerceTransactionCollections(
  options:
    | (TransactionCollectionOptions & { allowImplicit?: boolean })
    | (string | collections.ArangoCollection)[]
    | string
    | collections.ArangoCollection
): CoercedTransactionCollections {
  if (typeof options === "string") {
    return { write: [options] };
  }
  if (Array.isArray(options)) {
    return { write: options.map(collections.collectionToString) };
  }
  if (collections.isArangoCollection(options)) {
    return { write: collections.collectionToString(options) };
  }
  const opts: CoercedTransactionCollections = {};
  if (options) {
    if (options.allowImplicit !== undefined) {
      opts.allowImplicit = options.allowImplicit;
    }
    if (options.read) {
      opts.read = Array.isArray(options.read)
        ? options.read.map(collections.collectionToString)
        : collections.collectionToString(options.read);
    }
    if (options.write) {
      opts.write = Array.isArray(options.write)
        ? options.write.map(collections.collectionToString)
        : collections.collectionToString(options.write);
    }
    if (options.exclusive) {
      opts.exclusive = Array.isArray(options.exclusive)
        ? options.exclusive.map(collections.collectionToString)
        : collections.collectionToString(options.exclusive);
    }
  }
  return opts;
}

/**
 * @internal
 */
type CoercedTransactionCollections = {
  allowImplicit?: boolean;
  exclusive?: string | string[];
  write?: string | string[];
  read?: string | string[];
};

/**
 * Options for how the transaction should be performed.
 */
export type TransactionOptions = {
  /**
   * Whether the transaction may read from collections not specified for this
   * transaction. If set to `false`, accessing any collections not specified
   * will result in the transaction being aborted to avoid potential deadlocks.
   *
   * Default: `true`.
   */
  allowImplicit?: boolean;
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
  /**
   * Determines whether to force the transaction to write all data to disk
   * before returning.
   */
  waitForSync?: boolean;
  /**
   * Determines how long the database will wait while attempting to gain locks
   * on collections used by the transaction before timing out.
   */
  lockTimeout?: number;
  /**
   * Determines the transaction size limit in bytes.
   */
  maxTransactionSize?: number;
  /**
   * If set to `true`, the fast lock round will be skipped, which makes each
   * locking operation take longer but guarantees deterministic locking order
   * and may avoid deadlocks when many concurrent transactions are queued and
   * try to access the same collection with an exclusive lock.
   */
  skipFastLockRound?: boolean;
};

/**
 * Options for how the transaction should be committed.
 */
export type TransactionCommitOptions = {
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
};

/**
 * Options for how the transaction should be aborted.
 */
export type TransactionAbortOptions = {
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
};
//#endregion

//#region Transaction operation results
/**
 * Description of a transaction in a list of transactions.
 *
 * See also {@link TransactionInfo}.
 */
export type TransactionDescription = {
  /**
   * Unique identifier of the transaction.
   */
  id: string;
  /**
   * Status (or "state") of the transaction.
   */
  state: "running" | "committed" | "aborted";
};

/**
 * Status of a given transaction.
 *
 * See also {@link TransactionDescription}.
 */
export type TransactionInfo = {
  /**
   * Unique identifier of the transaction.
   */
  id: string;
  /**
   * Status of the transaction.
   */
  status: "running" | "committed" | "aborted";
};
//#endregion
//#region Transaction class
/**
 * Indicates whether the given value represents a {@link Transaction}.
 *
 * @param transaction - A value that might be a transaction.
 */
export function isArangoTransaction(
  transaction: any
): transaction is Transaction {
  return Boolean(transaction && transaction.isArangoTransaction);
}

/**
 * Represents a streaming transaction in a {@link databases.Database}.
 */
export class Transaction {
  protected _db: databases.Database;
  protected _id: string;

  /**
   * @internal
   */
  constructor(db: databases.Database, id: string) {
    this._db = db;
    this._id = id;
  }

  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB transaction.
   */
  get isArangoTransaction(): true {
    return true;
  }

  /**
   * Database this transaction belongs to.
   */
  get database() {
    return this._db;
  }

  /**
   * Unique identifier of this transaction.
   *
   * See {@link databases.Database#transaction}.
   */
  get id() {
    return this._id;
  }

  /**
   * Checks whether the transaction exists.
   *
   * @example
   * ```js
   * const db = new Database();
   * const trx = db.transaction("some-transaction");
   * const result = await trx.exists();
   * // result indicates whether the transaction exists
   * ```
   */
  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err: any) {
      if (errors.isArangoError(err) && err.errorNum === TRANSACTION_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Retrieves general information about the transaction.
   *
   * @example
   * ```js
   * const db = new Database();
   * const col = db.collection("some-collection");
   * const trx = db.beginTransaction(col);
   * await trx.step(() => col.save({ hello: "world" }));
   * const info = await trx.get();
   * // the transaction exists
   * ```
   */
  get(): Promise<TransactionInfo> {
    return this._db.request(
      {
        pathname: `/_api/transaction/${encodeURIComponent(this.id)}`,
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Attempts to commit the transaction to the databases.
   *
   * @param options - Options for comitting the transaction.
   *
   * @example
   * ```js
   * const db = new Database();
   * const col = db.collection("some-collection");
   * const trx = db.beginTransaction(col);
   * await trx.step(() => col.save({ hello: "world" }));
   * const result = await trx.commit();
   * // result indicates the updated transaction status
   * ```
   */
  commit(options: TransactionCommitOptions = {}): Promise<TransactionInfo> {
    const { allowDirtyRead = undefined } = options;
    return this._db.request(
      {
        method: "PUT",
        pathname: `/_api/transaction/${encodeURIComponent(this.id)}`,
        allowDirtyRead,
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Attempts to abort the transaction to the databases.
   *
   * @param options - Options for aborting the transaction.
   *
   * @example
   * ```js
   * const db = new Database();
   * const col = db.collection("some-collection");
   * const trx = db.beginTransaction(col);
   * await trx.step(() => col.save({ hello: "world" }));
   * const result = await trx.abort();
   * // result indicates the updated transaction status
   * ```
   */
  abort(options: TransactionAbortOptions = {}): Promise<TransactionInfo> {
    const { allowDirtyRead = undefined } = options;
    return this._db.request(
      {
        method: "DELETE",
        pathname: `/_api/transaction/${encodeURIComponent(this.id)}`,
        allowDirtyRead,
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Executes the given function as a single step of the transaction.
   *
   * @param T - Type of the callback's returned promise.
   * @param callback - Callback function returning a promise.
   *
   * The callback must return a `Promise`. The callback may be `async` and may
   * perform multiple arangojs calls (with `await` between them). All requests
   * made while the callback's returned Promise is pending are sent with this
   * transaction's ID.
   *
   * On Node.js, concurrent steps of **different** transactions on the same
   * {@link databases.Database} are supported because the driver tracks the
   * transaction ID per async context ({@link https://nodejs.org/api/async_context.html | AsyncLocalStorage}).
   *
   * In browsers, use separate `Database` instances for concurrent transactions.
   *
   * **Note**: Although almost anything can be wrapped in a callback and passed
   * to this method, that does not guarantee ArangoDB can actually do it in a
   * transaction. Refer to the ArangoDB documentation if you are unsure whether
   * a given operation can be executed as part of a transaction. Generally any
   * modification or retrieval of data is eligible but modifications of
   * collections or databases are not.
   *
   * @example
   * ```js
   * const db = new Database();
   * const vertices = db.collection("vertices");
   * const edges = db.collection("edges");
   * const trx = await db.beginTransaction({ write: [vertices, edges] });
   *
   * // The following code will be part of the transaction
   * const left = await trx.step(() => vertices.save({ label: "left" }));
   * const right = await trx.step(() => vertices.save({ label: "right" }));
   *
   * // Results from preceding actions can be used normally
   * await trx.step(() => edges.save({
   *   _from: left._id,
   *   _to: right._id,
   *   data: "potato"
   * }));
   *
   * // Transaction must be committed for changes to take effect
   * // Always call either trx.commit or trx.abort to end a transaction
   * await trx.commit();
   * ```
   *
   * @example
   * ```js
   * // Async work before a DB call stays inside the transaction:
   * await trx.step(async () => {
   *   await loadDataFromExternalApi();
   *   return collection.save({ _key: "x" });
   * });
   * await trx.abort(); // the save above is rolled back
   * ```
   *
   * @example
   * ```js
   * // Multiple DB calls in one step:
   * await trx.step(async () => {
   *   const a = await collection.save({ _key: "a" });
   *   const b = await collection.save({ _key: "b" });
   *   return b;
   * });
   * ```
   *
   * @example
   * ```js
   * // Concurrent transactions on one Database (Node.js):
   * const [r1, r2] = await Promise.all([
   *   trx1.step(() => collection.save({ _key: "a" })),
   *   trx2.step(() => collection.save({ _key: "b" })),
   * ]);
   * ```
   *
   * @example
   * ```js
   * // Prefer db.withTransaction for automatic commit/abort:
   * await db.withTransaction(collection, async (step) => {
   *   await step(() => collection.save({ _key: "a" }));
   *   await step(() => collection.save({ _key: "b" }));
   * });
   * ```
   *
   * @example
   * ```js
   * // BAD! The callback should not use helper functions that call arangojs
   * // methods without going through `trx.step` themselves!
   * async function saveSomeData() {
   *   await collection.save(data);
   *   await collection.save(moreData);
   * }
   * await trx.step(() => saveSomeData()); // WRONG
   *
   * // BETTER: Pass the transaction (or its step function) to helpers
   * async function saveSomeData(step) {
   *   await step(() => collection.save(data));
   *   await step(() => collection.save(moreData));
   * }
   * await saveSomeData(trx.step.bind(trx));
   * ```
   *
   * @example
   * ```js
   * // BAD! You must await each `trx.step` before starting the next step on
   * // the same transaction!
   * trx.step(() => collection.save(data)); // WRONG — not awaited
   * await trx.step(() => collection.save(moreData));
   *
   * // BETTER: Always await sequential steps on one transaction
   * await trx.step(() => collection.save(data));
   * await trx.step(() => collection.save(moreData));
   *
   * // OKAY: Chain with `.then` if async/await is not available
   * trx.step(() => collection.save(data))
   *   .then(() => trx.step(() => collection.save(moreData)));
   * ```
   *
   * @example
   * ```js
   * // BAD! The callback must return a promise — async functions must return
   * // or await the arangojs call!
   * await trx.step(async () => {
   *   collection.save(data); // WRONG — missing return/await
   * });
   *
   * // BETTER: Use an arrow function so you don't forget to return
   * await trx.step(() => collection.save(data));
   *
   * // OKAY: Remember to return when using a function body
   * await trx.step(() => {
   *   return collection.save(data);
   * });
   * ```
   *
   * @example
   * ```js
   * // BAD! You cannot pass a promise instead of a callback!
   * await trx.step(collection.save(data)); // WRONG
   *
   * // BETTER: Wrap the code in a function and pass the function instead
   * await trx.step(() => collection.save(data));
   * ```
   *
   * @example
   * ```js
   * // BAD! Non-async arangojs methods do not perform HTTP requests and must
   * // not be wrapped in `trx.step` — the callback must return a promise!
   * await trx.step(() => db.collection("my-documents")); // WRONG — throws
   *
   * // BETTER: Resolve collection handles outside the transaction step
   * const collection = db.collection("my-documents");
   * const trx = await db.beginTransaction(collection);
   * await trx.step(() => collection.save(data));
   * ```
   *
   * @example
   * ```js
   * // OKAY: Async logic after the arangojs call is fine as long as it does
   * // not invoke additional arangojs methods (easy to break later)
   * await trx.step(async () => {
   *   await collection.save(data);
   *   await doSomethingDifferent(); // no arangojs method calls
   * });
   * ```
   */
  step<T>(callback: () => Promise<T>): Promise<T> {
    return runTransactionStep(this.id, callback);
  }
}
//#endregion
