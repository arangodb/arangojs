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
import * as connection from "./connection.js";
import * as databases from "./databases.js";
import * as errors from "./errors.js";
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
   * Executes the given function locally as a single step of the transaction.
   *
   * @param T - Type of the callback's returned promise.
   * @param callback - Callback function returning a promise.
   *
   * **Warning**: The callback function should wrap a single call of an async
   * arangojs method (e.g. a method on a `Collection` object of a collection
   * that is involved in the transaction or the `db.query` method).
   * If the callback function is async, only the first promise-returning (or
   * async) method call will be executed as part of the transaction. See the
   * examples below for how to avoid common mistakes when using this method.
   *
   * **Note**: Avoid defining the callback as an async function if possible
   * as arangojs will throw an error if the callback did not return a promise.
   * Async functions will return an empty promise by default, making it harder
   * to notice if you forgot to return something from the callback.
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
   * // Transaction must be committed for changes to take effected
   * // Always call either trx.commit or trx.abort to end a transaction
   * await trx.commit();
   * ```
   *
   * @example
   * ```js
   * // BAD! If the callback is an async function it must only use await once!
   * await trx.step(async () => {
   *   await collection.save(data);
   *   await collection.save(moreData); // WRONG
   * });
   *
   * // BAD! Callback function must use only one arangojs call!
   * await trx.step(() => {
   *  return collection.save(data)
   *    .then(() => collection.save(moreData)); // WRONG
   * });
   *
   * // BETTER: Wrap every arangojs method call that should be part of the
   * // transaction in a separate `trx.step` call
   * await trx.step(() => collection.save(data));
   * await trx.step(() => collection.save(moreData));
   * ```
   *
   * @example
   * ```js
   * // BAD! If the callback is an async function it must not await before
   * // calling an arangojs method!
   * await trx.step(async () => {
   *   await doSomethingElse();
   *   return collection.save(data); // WRONG
   * });
   *
   * // BAD! Any arangojs inside the callback must not happen inside a promise
   * // method!
   * await trx.step(() => {
   *   return doSomethingElse()
   *     .then(() => collection.save(data)); // WRONG
   * });
   *
   * // BETTER: Perform any async logic needed outside the `trx.step` call
   * await doSomethingElse();
   * await trx.step(() => collection.save(data));
   *
   * // OKAY: You can perform async logic in the callback after the arangojs
   * // method call as long as it does not involve additional arangojs method
   * // calls, but this makes it easy to make mistakes later
   * await trx.step(async () => {
   *   await collection.save(data);
   *   await doSomethingDifferent(); // no arangojs method calls allowed
   * });
   * ```
   *
   * @example
   * ```js
   * // BAD! The callback should not use any functions that themselves use any
   * // arangojs methods!
   * async function saveSomeData() {
   *   await collection.save(data);
   *   await collection.save(moreData);
   * }
   * await trx.step(() => saveSomeData()); // WRONG
   *
   * // BETTER: Pass the transaction to functions that need to call arangojs
   * // methods inside a transaction
   * async function saveSomeData(trx) {
   *   await trx.step(() => collection.save(data));
   *   await trx.step(() => collection.save(moreData));
   * }
   * await saveSomeData(); // no `trx.step` call needed
   * ```
   *
   * @example
   * ```js
   * // BAD! You must wait for the promise to resolve (or await on the
   * // `trx.step` call) before calling `trx.step` again!
   * trx.step(() => collection.save(data)); // WRONG
   * await trx.step(() => collection.save(moreData));
   *
   * // BAD! The trx.step callback can not make multiple calls to async arangojs
   * // methods, not even using Promise.all!
   * await trx.step(() => Promise.all([ // WRONG
   *   collection.save(data),
   *   collection.save(moreData),
   * ]));
   *
   * // BAD! Multiple `trx.step` calls can not run in parallel!
   * await Promise.all([ // WRONG
   *   trx.step(() => collection.save(data)),
   *   trx.step(() => collection.save(moreData)),
   * ]));
   *
   * // BETTER: Always call `trx.step` sequentially, one after the other
   * await trx.step(() => collection.save(data));
   * await trx.step(() => collection.save(moreData));
   *
   * // OKAY: The then callback can be used if async/await is not available
   * trx.step(() => collection.save(data))
   *   .then(() => trx.step(() => collection.save(moreData)));
   * ```
   *
   * @example
   * ```js
   * // BAD! The callback will return an empty promise that resolves before
   * // the inner arangojs method call has even talked to ArangoDB!
   * await trx.step(async () => {
   *   collection.save(data); // WRONG
   * });
   *
   * // BETTER: Use an arrow function so you don't forget to return
   * await trx.step(() => collection.save(data));
   *
   * // OKAY: Remember to always return when using a function body
   * await trx.step(() => {
   *   return collection.save(data); // easy to forget!
   * });
   *
   * // OKAY: You do not have to use arrow functions but it helps
   * await trx.step(function () {
   *   return collection.save(data);
   * });
   * ```
   *
   * @example
   * ```js
   * // BAD! You can not pass promises instead of a callback!
   * await trx.step(collection.save(data)); // WRONG
   *
   * // BETTER: Wrap the code in a function and pass the function instead
   * await trx.step(() => collection.save(data));
   * ```
   *
   * @example
   * ```js
   * // WORSE: Calls to non-async arangojs methods don't need to be performed
   * // as part of a transaction
   * const collection = await trx.step(() => db.collection("my-documents"));
   *
   * // BETTER: If an arangojs method is not async and doesn't return promises,
   * // call it without `trx.step`
   * const collection = db.collection("my-documents");
   * ```
   */
  step<T>(callback: () => Promise<T>): Promise<T> {
    const conn = (this._db as any)._connection as connection.Connection;
    conn.setTransactionId(this.id);
    try {
      const promise = callback();
      if (!promise) {
        throw new Error(
          "Transaction callback was not an async function or did not return a promise!"
        );
      }
      return Promise.resolve(promise);
    } finally {
      conn.clearTransactionId();
    }
  }
}
//#endregion
