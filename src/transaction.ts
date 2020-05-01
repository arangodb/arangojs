/**
 * `import type { Transaction } from "arangojs/transaction";`
 *
 * TODO
 *
 * @packageDocumentation
 */
import { Connection } from "./connection";
import { Database } from "./database";
import { isArangoError } from "./error";
import { TRANSACTION_NOT_FOUND } from "./util/codes";

/**
 * Indicates whether the given value represents an {@link ArangoTransaction}.
 *
 * @param transaction - A value that might be a transaction.
 */
export function isArangoTransaction(
  transaction: any
): transaction is Transaction {
  return Boolean(transaction && transaction.isArangoTransaction);
}

/**
 * TODO
 */
export type TransactionStatus = {
  id: string;
  status: "running" | "committed" | "aborted";
};

/**
 * TODO
 */
export class Transaction {
  protected _db: Database;
  protected _id: string;

  /**
   * @internal
   * @hidden
   */
  constructor(db: Database, id: string) {
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
   * TODO
   */
  get id() {
    return this._id;
  }

  /**
   * TODO
   */
  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === TRANSACTION_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  /**
   * TODO
   */
  get(): Promise<TransactionStatus> {
    return this._db.request(
      {
        path: `/_api/transaction/${this.id}`,
      },
      (res) => res.body.result
    );
  }

  /**
   * TODO
   */
  commit(): Promise<TransactionStatus> {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/transaction/${this.id}`,
      },
      (res) => res.body.result
    );
  }

  /**
   * TODO
   */
  abort(): Promise<TransactionStatus> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/transaction/${this.id}`,
      },
      (res) => res.body.result
    );
  }

  /**
   * TODO
   */
  run<T>(fn: () => Promise<T>): Promise<T> {
    const conn = (this._db as any)._connection as Connection;
    conn.setTransactionId(this.id);
    try {
      return Promise.resolve(fn());
    } finally {
      conn.clearTransactionId();
    }
  }
}
