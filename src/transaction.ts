import { Connection } from "./connection";

interface TransactionStatus {
  id: string;
  status: "running" | "committed" | "aborted";
}

export class ArangoTransaction {
  isArangoTransaction: true = true;
  private _connection: Connection;
  id: string;

  constructor(connection: Connection, id: string) {
    this._connection = connection;
    this.id = id;
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
      return fn();
    } finally {
      this._connection.clearTransactionId();
    }
  }
}
