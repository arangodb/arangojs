import { Connection } from "./connection";
import { Database } from "./database";
import { isArangoError } from "./error";
import { TRANSACTION_NOT_FOUND } from "./util/codes";

export function isArangoTransaction(
  transaction: any
): transaction is Transaction {
  return Boolean(transaction && transaction.isArangoTransaction);
}

export type TransactionStatus = {
  id: string;
  status: "running" | "committed" | "aborted";
};

export class Transaction {
  protected _db: Database;
  protected _id: string;

  /** @hidden */
  constructor(db: Database, id: string) {
    this._db = db;
    this._id = id;
  }

  get isArangoTransaction(): true {
    return true;
  }

  get id() {
    return this._id;
  }

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

  get(): Promise<TransactionStatus> {
    return this._db.request(
      {
        path: `/_api/transaction/${this.id}`,
      },
      (res) => res.body.result
    );
  }

  commit(): Promise<TransactionStatus> {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/transaction/${this.id}`,
      },
      (res) => res.body.result
    );
  }

  abort(): Promise<TransactionStatus> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/transaction/${this.id}`,
      },
      (res) => res.body.result
    );
  }

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
