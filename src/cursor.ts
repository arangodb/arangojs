import { Connection } from "./connection";

export class ArrayCursor {
  extra: any;
  count: number;

  private _connection: Connection;
  private _result: any;
  private _hasMore: boolean;
  private _id: string;
  private _host?: number;

  constructor(connection: Connection, body: any, host?: number) {
    this.extra = body.extra;
    this._connection = connection;
    this._result = body.result;
    this._hasMore = Boolean(body.hasMore);
    this._id = body.id;
    this._host = host;
    this.count = body.count;
  }

  private async _drain(): Promise<ArrayCursor> {
    await this._more();
    if (!this._hasMore) return this;
    return this._drain();
  }

  private async _more() {
    if (!this._hasMore) return;
    else {
      const res = await this._connection.request({
        method: "PUT",
        path: `/_api/cursor/${this._id}`,
        host: this._host
      });
      this._result.push(...res.body.result);
      this._hasMore = res.body.hasMore;
    }
  }

  async all() {
    await this._drain();
    let result = this._result;
    this._result = [];
    return result;
  }

  async next(): Promise<any | undefined> {
    while (!this._result.length && this._hasMore) {
      await this._more();
    }
    if (!this._result.length) {
      return undefined;
    }
    return this._result.shift();
  }

  hasNext() {
    return Boolean(this._hasMore || this._result.length);
  }

  async each(
    fn: (value: any, index: number, self: ArrayCursor) => boolean | void
  ): Promise<boolean> {
    let index = 0;
    while (this._result.length || this._hasMore) {
      let result;
      while (this._result.length) {
        result = fn(this._result.shift(), index, this);
        index++;
        if (result === false) return result;
      }
      if (this._hasMore) await this._more();
    }
    return true;
  }

  async every(
    fn: (value: any, index: number, self: ArrayCursor) => boolean
  ): Promise<boolean> {
    let index = 0;
    while (this._result.length || this._hasMore) {
      let result;
      while (this._result.length) {
        result = fn(this._result.shift(), index, this);
        index++;
        if (!result) return false;
      }
      if (this._hasMore) await this._more();
    }
    return true;
  }

  async some(
    fn: (value: any, index: number, self: ArrayCursor) => boolean
  ): Promise<boolean> {
    let index = 0;
    while (this._result.length || this._hasMore) {
      let result;
      while (this._result.length) {
        result = fn(this._result.shift(), index, this);
        index++;
        if (result) return true;
      }
      if (this._hasMore) await this._more();
    }
    return false;
  }

  async map<T>(
    fn: (value: any, index: number, self: ArrayCursor) => T
  ): Promise<T[]> {
    let index = 0;
    let result: any[] = [];
    while (this._result.length || this._hasMore) {
      while (this._result.length) {
        result.push(fn(this._result.shift(), index, this));
        index++;
      }
      if (this._hasMore) await this._more();
    }
    return result;
  }

  async reduce<T>(
    fn: (accu: T, value: any, index: number, self: ArrayCursor) => T,
    accu?: T
  ): Promise<T | undefined> {
    let index = 0;
    if (accu === undefined) {
      if (!this._result.length && !this._hasMore) {
        await this._more();
      }
      accu = this._result.shift();
      index += 1;
    }
    while (this._result.length || this._hasMore) {
      while (this._result.length) {
        accu = fn(accu!, this._result.shift(), index, this);
        index++;
      }
      if (this._hasMore) await this._more();
    }
    return accu;
  }
}
