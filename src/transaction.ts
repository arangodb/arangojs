import { Connection } from "./connection";
import { isArangoError } from "./error";

interface TransactionStatus {
  id: string;
  status: "running" | "committed" | "aborted";
}

const TRANSACTION_NOT_FOUND = 10;
export class ArangoTransaction {
  isArangoTransaction: true = true;
  private _connection: Connection;
  id: string;

  constructor(connection: Connection, id: string) {
    this._connection = connection;
    this.id = id;
  }

  exists(): Promise<boolean> {
    return this.get().then(
      () => true,
      err => {
        if (isArangoError(err) && err.errorNum === TRANSACTION_NOT_FOUND) {
          return false;
        }
        throw err;
      }
    );
  }

  get(): Promise<TransactionStatus> {
    return this._connection.request(
      {
        path: `/_api/transaction/${this.id}`
      },
      res => res.body.result
    );
  }

  commit(): Promise<TransactionStatus> {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/transaction/${this.id}`
      },
      res => res.body.result
    );
  }

  abort(): Promise<TransactionStatus> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/transaction/${this.id}`
      },
      res => res.body.result
    );
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    this._connection.setTransactionId(this.id);
    try {
      return Promise.resolve(fn());
    } finally {
      this._connection.clearTransactionId();
    }
  }
}
