/**
 * ```ts
 * import type { ArrayCursor, BatchedArrayCursor } from "arangojs/cursor";
 * ```
 *
 * The "cursor" module provides cursor-related interfaces for TypeScript.
 *
 * @packageDocumentation
 */
import { LinkedList } from "x3-linkedlist";
import { Dict } from "./connection";
import { Database } from "./database";

/**
 * Additional information about the cursor.
 */
export interface CursorExtras {
  /**
   * Warnings encountered while executing the query.
   */
  warnings: {
    code: number;
    message: string;
  }[];
  /**
   * Query execution plan for the executed query.
   */
  plan?: any;
  /**
   * Additional profiling information for the executed query.
   */
  profile?: any;
  /**
   * Additional statistics about the query execution.
   */
  stats?: Dict<any>;
}

interface BatchView<T = any> {
  isEmpty: boolean;
  more(): Promise<void>;
  shift(): T | undefined;
}

/**
 * The `BatchedArrayCursor` provides a batch-wise API to an {@link ArrayCursor}.
 *
 * When using TypeScript, cursors can be cast to a specific item type in order
 * to increase type safety.
 *
 * @param T - Type to use for each item. Defaults to `any`.
 *
 * @example
 * ```ts
 * const db = new Database();
 * const query = aql`FOR x IN 1..5 RETURN x`;
 * const cursor = await db.query(query) as ArrayCursor<number>;
 * const batches = cursor.batches;
 * ```
 *
 * @example
 * ```js
 * const db = new Database();
 * const query = aql`FOR x IN 1..10000 RETURN x`;
 * const cursor = await db.query(query, { batchSize: 10 });
 * for await (const batch of cursor.batches) {
 *   // Process all values in a batch in parallel
 *   await Promise.all(batch.map(
 *     value => asyncProcessValue(value)
 *   ));
 * }
 * ```
 */
export class BatchedArrayCursor<T = any> {
  protected _db: Database;
  protected _batches: LinkedList<LinkedList<any>>;
  protected _count?: number;
  protected _extra: CursorExtras;
  protected _hasMore: boolean;
  protected _id: string | undefined;
  protected _host?: number;
  protected _allowDirtyRead?: boolean;
  protected _itemsCursor: ArrayCursor<T>;

  /**
   * @internal
   * @hidden
   */
  constructor(
    db: Database,
    body: {
      extra: any;
      result: T[];
      hasMore: boolean;
      id: string;
      count: number;
    },
    host?: number,
    allowDirtyRead?: boolean
  ) {
    const batches = new LinkedList(
      body.result.length ? [new LinkedList(body.result)] : []
    );
    this._db = db;
    this._batches = batches;
    this._id = body.id;
    this._hasMore = Boolean(body.id && body.hasMore);
    this._host = host;
    this._count = body.count;
    this._extra = body.extra;
    this._allowDirtyRead = allowDirtyRead;
    this._itemsCursor = new ArrayCursor(this, {
      get isEmpty() {
        return !batches.length;
      },
      more: () => this._more(),
      shift: () => {
        let batch = batches.first?.value;
        while (batch && !batch.length) {
          batches.shift();
          batch = batches.first?.value;
        }
        if (!batch) return undefined;
        const value = batch.shift();
        if (!batch.length) batches.shift();
        return value;
      },
    });
  }

  protected async _more(): Promise<void> {
    if (!this.hasMore) return;
    const res = await this._db.request({
      method: "PUT",
      path: `/_api/cursor/${this._id}`,
      host: this._host,
      allowDirtyRead: this._allowDirtyRead,
    });
    this._batches.push(new LinkedList(res.body.result));
    this._hasMore = res.body.hasMore;
  }

  /**
   * An {@link ArrayCursor} providing item-wise access to the cursor result set.
   *
   * See also {@link ArrayCursor.batches}.
   */
  get items() {
    return this._itemsCursor;
  }

  /**
   * Additional information about the cursor.
   */
  get extra(): Readonly<CursorExtras> {
    return this._extra;
  }

  /**
   * Total number of documents in the query result. Only available if the
   * `count` option was used.
   */
  get count(): number | undefined {
    return this._count;
  }

  /**
   * Whether the cursor has any remaining batches that haven't yet been
   * fetched. If set to `false`, all batches have been fetched and no
   * additional requests to the server will be made when consuming any
   * remaining batches from this cursor.
   */
  get hasMore(): boolean {
    return this._hasMore;
  }

  /**
   * Whether the cursor has more batches. If set to `false`, the cursor has
   * already been depleted and contains no more batches.
   */
  get hasNext(): boolean {
    return this.hasMore || Boolean(this._batches.length);
  }

  /**
   * Enables use with `for await` to deplete the cursor by asynchronously
   * yielding every batch in the cursor's remaining result set.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`
   *   FOR user IN users
   *   FILTER user.isActive
   *   RETURN user
   * `);
   * for await (const users of cursor.batches) {
   *   for (const user of users) {
   *     console.log(user.email, user.isAdmin);
   *   }
   * }
   * ```
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<T[], undefined, undefined> {
    while (this.hasNext) {
      yield this.next() as Promise<T[]>;
    }
    return undefined;
  }

  /**
   * Loads all remaining batches from the server.
   *
   * **Warning**: This may impact memory use when working with very large
   * query result sets.
   *
   * @example
   * ```js
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 1 }
   * );
   * console.log(cursor.hasMore); // true
   * await cursor.batches.loadAll();
   * console.log(cursor.hasMore); // false
   * console.log(cursor.hasNext); // true
   * for await (const item of cursor) {
   *   console.log(item);
   *   // No server roundtrips necessary any more
   * }
   * ```
   */
  async loadAll(): Promise<void> {
    while (this._hasMore) {
      await this._more();
    }
  }

  /**
   * Depletes the cursor, then returns an array containing all batches in the
   * cursor's remaining result list.
   *
   * @example
   * ```js
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 2 }
   * );
   * const result = await cursor.batches.all(); // [[1, 2], [3, 4], [5]]
   * console.log(cursor.hasNext); // false
   * ```
   */
  async all(): Promise<T[][]> {
    return this.map((batch) => batch);
  }

  /**
   * Advances the cursor and returns all remaining values in the cursor's
   * current batch. If the current batch has already been exhausted, fetches
   * the next batch from the server and returns it, or `undefined` if the
   * cursor has been depleted.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * @example
   * ```js
   * const cursor = await db.query(
   *   aql`FOR i IN 1..10 RETURN i`,
   *   { batchSize: 5 }
   * );
   * const firstBatch = await cursor.batches.next(); // [1, 2, 3, 4, 5]
   * await cursor.next(); // 6
   * const lastBatch = await cursor.batches.next(); // [7, 8, 9, 10]
   * console.log(cursor.hasNext); // false
   * ```
   */
  async next(): Promise<T[] | undefined> {
    while (!this._batches.length && this.hasNext) {
      await this._more();
    }
    if (!this._batches.length) {
      return undefined;
    }
    const batch = this._batches.shift();
    if (!batch) return undefined;
    const values = [...batch.values()];
    batch.clear(true);
    return values;
  }

  /**
   * Advances the cursor by applying the `callback` function to each item in
   * the cursor's remaining result list until the cursor is depleted or
   * `callback` returns the exact value `false`. Returns a promise that
   * evalues to `true` unless the function returned `false`.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach | `Array.prototype.forEach`}.
   *
   * @param callback - Function to execute on each element.
   *
   * @example
   * ```js
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 2 }
   * );
   * const result = await cursor.batches.forEach((currentBatch) => {
   *   for (const value of currentBatch) {
   *     console.log(value);
   *   }
   * });
   * console.log(result) // true
   * console.log(cursor.hasNext); // false
   * ```
   *
   * @example
   * ```js
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 2 }
   * );
   * const result = await cursor.batches.forEach((currentBatch) => {
   *   for (const value of currentBatch) {
   *     console.log(value);
   *   }
   *   return false; // stop after the first batch
   * });
   * console.log(result); // false
   * console.log(cursor.hasNext); // true
   * ```
   */
  async forEach(
    callback: (currentBatch: T[], index: number, self: this) => false | void
  ): Promise<boolean> {
    let index = 0;
    while (this.hasNext) {
      const currentBatch = await this.next();
      const result = callback(currentBatch!, index, this);
      index++;
      if (result === false) return result;
      if (this.hasNext) await this._more();
    }
    return true;
  }

  /**
   * Depletes the cursor by applying the `callback` function to each batch in
   * the cursor's remaining result list. Returns an array containing the
   * return values of `callback` for each batch.
   *
   * **Note**: This creates an array of all return values, which may impact
   * memory use when working with very large query result sets. Consider using
   * {@link BatchedArrayCursor.forEach}, {@link BatchedArrayCursor.reduce} or
   * {@link BatchedArrayCursor.flatMap} instead.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map | `Array.prototype.map`}.
   *
   * @param R - Return type of the `callback` function.
   * @param callback - Function to execute on each element.
   *
   * @example
   * ```js
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 2 }
   * );
   * const squares = await cursor.batches.map((currentBatch) => {
   *   return currentBatch.map((value) => value ** 2);
   * });
   * console.log(squares); // [[1, 4], [9, 16], [25]]
   * console.log(cursor.hasNext); // false
   * ```
   */
  async map<R>(
    callback: (currentBatch: T[], index: number, self: this) => R
  ): Promise<R[]> {
    let index = 0;
    let result: any[] = [];
    while (this.hasNext) {
      const currentBatch = await this.next();
      result.push(callback(currentBatch!, index, this));
      index++;
    }
    return result;
  }

  /**
   * Depletes the cursor by applying the `callback` function to each batch in
   * the cursor's remaining result list. Returns an array containing the
   * return values of `callback` for each batch, flattened to a depth of 1.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap | `Array.prototype.flatMap`}.
   *
   * @param R - Return type of the `callback` function.
   * @param callback - Function to execute on each element.
   *
   * @example
   * ```js
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 2 }
   * );
   * const squares = await cursor.batches.flatMap((currentBatch) => {
   *   return currentBatch.map((value) => value ** 2);
   * });
   * console.log(squares); // [1, 1, 2, 4, 3, 9, 4, 16, 5, 25]
   * console.log(cursor.hasNext); // false
   * ```
   *
   * @example
   * ```js
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 1 }
   * );
   * const odds = await cursor.batches.flatMap((currentBatch) => {
   *   if (currentBatch[0] % 2 === 0) {
   *     return []; // empty array flattens into nothing
   *   }
   *   return currentBatch;
   * });
   * console.logs(odds); // [1, 3, 5]
   * ```
   */
  async flatMap<R>(
    callback: (currentBatch: T[], index: number, self: this) => R | R[]
  ): Promise<R[]> {
    let index = 0;
    let result: any[] = [];
    while (this.hasNext) {
      const currentBatch = await this.next();
      const value = callback(currentBatch!, index, this);
      if (Array.isArray(value)) {
        result.push(...value);
      } else {
        result.push(value);
      }
      index++;
    }
    return result;
  }

  /**
   * Depletes the cursor by applying the `reducer` function to each batch in
   * the cursor's remaining result list. Returns the return value of `reducer`
   * for the last batch.
   *
   * **Note**: Most complex uses of the `reduce` method can be replaced with
   * simpler code using {@link BatchedArrayCursor.forEach} or the `for await`
   * syntax.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | `Array.prototype.reduce`}.
   *
   * @param R - Return type of the `reducer` function.
   * @param reducer - Function to execute on each element.
   * @param initialValue - Initial value of the `accumulator` value passed to
   * the `reducer` function.
   *
   * @example
   * ```js
   * function largestValue(baseline, values) {
   *   return Math.max(baseline, ...values);
   * }
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 3 }
   * );
   * const result = await cursor.batches.reduce(largestValue, 0);
   * console.log(result); // 5
   * console.log(cursor.hasNext); // false
   * const emptyResult = await cursor.batches.reduce(largestValue, 0);
   * console.log(emptyResult); // 0
   * ```
   *
   * @example
   * ```js
   * // BAD! NEEDLESSLY COMPLEX!
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 1 }
   * );
   * const result = await cursor.reduce((accumulator, currentBatch) => {
   *   accumulator[
   *     currentBatch[0] % 2 === 0 ? "even" : "odd"
   *   ].push(...currentBatch);
   *   return accumulator;
   * }, { odd: [], even: [] });
   * console.log(result); // { odd: [1, 3, 5], even: [2, 4] }
   *
   * // GOOD! MUCH SIMPLER!
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const odd = [];
   * const even = [];
   * for await (const item of cursor) {
   *   if (currentBatch[0] % 2 === 0) {
   *     even.push(...currentBatch);
   *   } else {
   *     odd.push(...currentBatch);
   *   }
   * }
   * console.log({ odd, even }); // { odd: [1, 3, 5], even: [2, 4] }
   * ```
   */
  async reduce<R>(
    reducer: (
      accumulator: R,
      currentBatch: T[],
      index: number,
      self: this
    ) => R,
    initialValue: R
  ): Promise<R>;

  /**
   * Depletes the cursor by applying the `reducer` function to each batch in
   * the cursor's remaining result list. Returns the return value of `reducer`
   * for the last batch.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | `Array.prototype.reduce`}.
   *
   * @param R - Return type of the `reducer` function.
   * @param reducer - Function to execute on each element.
   *
   * @example
   * ```js
   * function largestValue(values1, values2) {
   *   return [Math.max(...values1, ...values2)];
   * }
   * const cursor = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 3 }
   * );
   * const result = await cursor.batches.reduce(largestValue);
   * console.log(result); // [5]
   * console.log(cursor.hasNext); // false
   * ```
   *
   */
  async reduce<R>(
    reducer: (
      accumulator: T[] | R,
      currentBatch: T[],
      index: number,
      self: this
    ) => R
  ): Promise<R | undefined>;
  async reduce<R>(
    reducer: (
      accumulator: R,
      currentBatch: T[],
      index: number,
      self: this
    ) => R,
    initialValue?: R
  ): Promise<R | undefined> {
    let index = 0;
    if (!this.hasNext) return initialValue;
    if (initialValue === undefined) {
      initialValue = (await this.next()) as any;
      index += 1;
    }
    let value = initialValue as R;
    while (this.hasNext) {
      const currentBatch = await this.next();
      value = reducer(value, currentBatch!, index, this);
      index++;
    }
    return value;
  }

  /**
   * Drains the cursor and frees up associated database resources.
   *
   * This method has no effect if all batches have already been consumed.
   *
   * @example
   * ```js
   * const cursor1 = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * console.log(cursor1.hasMore); // false
   * await cursor1.kill(); // no effect
   *
   * const cursor2 = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 2 }
   * );
   * console.log(cursor2.hasMore); // true
   * await cursor2.kill(); // cursor is depleted
   * ```
   */
  async kill(): Promise<void> {
    if (this._batches.length) {
      for (const batch of this._batches.values()) {
        batch.clear();
      }
      this._batches.clear();
    }
    if (!this.hasNext) return undefined;
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/cursor/${this._id}`,
      },
      () => {
        this._hasMore = false;
        return undefined;
      }
    );
  }
}

/**
 * The `ArrayCursor` type represents a cursor returned from a
 * {@link Database.query}.
 *
 * When using TypeScript, cursors can be cast to a specific item type in order
 * to increase type safety.
 *
 * See also {@link BatchedArrayCursor}.
 *
 * @param T - Type to use for each item. Defaults to `any`.
 *
 * @example
 * ```ts
 * const db = new Database();
 * const query = aql`FOR x IN 1..5 RETURN x`;
 * const result = await db.query(query) as ArrayCursor<number>;
 * ```
 *
 * @example
 * ```js
 * const db = new Database();
 * const query = aql`FOR x IN 1..10 RETURN x`;
 * const cursor = await db.query(query);
 * for await (const value of cursor) {
 *   // Process each value asynchronously
 *   await processValue(value);
 * }
 * ```
 */
export class ArrayCursor<T = any> {
  protected _batches: BatchedArrayCursor<T>;
  protected _view: BatchView<T>;

  constructor(batchedCursor: BatchedArrayCursor, view: BatchView<T>) {
    this._batches = batchedCursor;
    this._view = view;
  }

  /**
   * A {@link BatchedArrayCursor} providing batch-wise access to the cursor
   * result set.
   *
   * See also {@link BatchedArrayCursor.items}.
   */
  get batches() {
    return this._batches;
  }

  /**
   * Additional information about the cursor.
   */
  get extra(): CursorExtras {
    return this.batches.extra;
  }

  /**
   * Total number of documents in the query result. Only available if the
   * `count` option was used.
   */
  get count(): number | undefined {
    return this.batches.count;
  }

  /**
   * Whether the cursor has more values. If set to `false`, the cursor has
   * already been depleted and contains no more items.
   */
  get hasNext(): boolean {
    return this.batches.hasNext;
  }

  /**
   * Enables use with `for await` to deplete the cursor by asynchronously
   * yielding every value in the cursor's remaining result set.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`
   *   FOR user IN users
   *   FILTER user.isActive
   *   RETURN user
   * `);
   * for await (const user of cursor) {
   *   console.log(user.email, user.isAdmin);
   * }
   * ```
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<T, undefined, undefined> {
    while (this.hasNext) {
      yield this.next() as Promise<T>;
    }
    return undefined;
  }

  /**
   * Depletes the cursor, then returns an array containing all values in the
   * cursor's remaining result list.
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const result = await cursor.all(); // [1, 2, 3, 4, 5]
   * console.log(cursor.hasNext); // false
   * ```
   */
  async all(): Promise<T[]> {
    return this.batches.flatMap((v) => v);
  }

  /**
   * Advances the cursor and returns the next value in the cursor's remaining
   * result list, or `undefined` if the cursor has been depleted.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`FOR x IN 1..3 RETURN x`);
   * const one = await cursor.next(); // 1
   * const two = await cursor.next(); // 2
   * const three = await cursor.next(); // 3
   * const empty = await cursor.next(); // undefined
   * ```
   */
  async next(): Promise<T | undefined> {
    while (this._view.isEmpty && this.batches.hasMore) {
      await this._view.more();
    }
    if (this._view.isEmpty) {
      return undefined;
    }
    return this._view.shift();
  }

  /**
   * Advances the cursor by applying the `callback` function to each item in
   * the cursor's remaining result list until the cursor is depleted or
   * `callback` returns the exact value `false`. Returns a promise that
   * evalues to `true` unless the function returned `false`.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach | `Array.prototype.forEach`}.
   *
   * @param callback - Function to execute on each element.
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const result = await cursor.forEach((currentValue) => {
   *   console.log(currentValue);
   * });
   * console.log(result) // true
   * console.log(cursor.hasNext); // false
   * ```
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const result = await cursor.forEach((currentValue) => {
   *   console.log(currentValue);
   *   return false; // stop after the first item
   * });
   * console.log(result); // false
   * console.log(cursor.hasNext); // true
   * ```
   */
  async forEach(
    callback: (currentValue: T, index: number, self: this) => false | void
  ): Promise<boolean> {
    let index = 0;
    while (this.hasNext) {
      const value = await this.next();
      const result = callback(value!, index, this);
      index++;
      if (result === false) return result;
    }
    return true;
  }

  /**
   * Depletes the cursor by applying the `callback` function to each item in
   * the cursor's remaining result list. Returns an array containing the
   * return values of `callback` for each item.
   *
   * **Note**: This creates an array of all return values, which may impact
   * memory use when working with very large query result sets. Consider using
   * {@link ArrayCursor.forEach}, {@link ArrayCursor.reduce} or
   * {@link ArrayCursor.flatMap} instead.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map | `Array.prototype.map`}.
   *
   * @param R - Return type of the `callback` function.
   * @param callback - Function to execute on each element.
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const squares = await cursor.map((currentValue) => {
   *   return currentValue ** 2;
   * });
   * console.log(squares); // [1, 4, 9, 16, 25]
   * console.log(cursor.hasNext); // false
   * ```
   */
  async map<R>(
    callback: (currentValue: T, index: number, self: this) => R
  ): Promise<R[]> {
    let index = 0;
    let result: any[] = [];
    while (this.hasNext) {
      const value = await this.next();
      result.push(callback(value!, index, this));
      index++;
    }
    return result;
  }

  /**
   * Depletes the cursor by applying the `callback` function to each item in
   * the cursor's remaining result list. Returns an array containing the
   * return values of `callback` for each item, flattened to a depth of 1.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap | `Array.prototype.flatMap`}.
   *
   * @param R - Return type of the `callback` function.
   * @param callback - Function to execute on each element.
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const squares = await cursor.flatMap((currentValue) => {
   *   return [currentValue, currentValue ** 2];
   * });
   * console.log(squares); // [1, 1, 2, 4, 3, 9, 4, 16, 5, 25]
   * console.log(cursor.hasNext); // false
   * ```
   *
   * @example
   * ```js
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const odds = await cursor.flatMap((currentValue) => {
   *   if (currentValue % 2 === 0) {
   *     return []; // empty array flattens into nothing
   *   }
   *   return currentValue; // or [currentValue]
   * });
   * console.logs(odds); // [1, 3, 5]
   * ```
   */
  async flatMap<R>(
    callback: (currentValue: T, index: number, self: this) => R | R[]
  ): Promise<R[]> {
    let index = 0;
    let result: any[] = [];
    while (this.hasNext) {
      const value = await this.next();
      const item = callback(value!, index, this);
      if (Array.isArray(item)) {
        result.push(...item);
      } else {
        result.push(item);
      }
      index++;
    }
    return result;
  }

  /**
   * Depletes the cursor by applying the `reducer` function to each item in
   * the cursor's remaining result list. Returns the return value of `reducer`
   * for the last item.
   *
   * **Note**: Most complex uses of the `reduce` method can be replaced with
   * simpler code using {@link ArrayCursor.forEach} or the `for await` syntax.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | `Array.prototype.reduce`}.
   *
   * @param R - Return type of the `reducer` function.
   * @param reducer - Function to execute on each element.
   * @param initialValue - Initial value of the `accumulator` value passed to
   * the `reducer` function.
   *
   * @example
   * ```js
   * function largestOfTwo(one, two) {
   *   return Math.max(one, two);
   * }
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const result = await cursor.reduce(largestOfTwo, 0);
   * console.log(result); // 5
   * console.log(cursor.hasNext); // false
   * const emptyResult = await cursor.reduce(largestOfTwo, 0);
   * console.log(emptyResult); // 0
   * ```
   *
   * @example
   * ```js
   * // BAD! NEEDLESSLY COMPLEX!
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const result = await cursor.reduce((accumulator, currentValue) => {
   *   accumulator[currentValue % 2 === 0 ? "even" : "odd"].push(currentValue);
   *   return accumulator;
   * }, { odd: [], even: [] });
   * console.log(result); // { odd: [1, 3, 5], even: [2, 4] }
   *
   * // GOOD! MUCH SIMPLER!
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const odd = [];
   * const even = [];
   * for await (const item of cursor) {
   *   if (currentValue % 2 === 0) {
   *     even.push(currentValue);
   *   } else {
   *     odd.push(currentValue);
   *   }
   * }
   * console.log({ odd, even }); // { odd: [1, 3, 5], even: [2, 4] }
   * ```
   */
  async reduce<R>(
    reducer: (accumulator: R, currentValue: T, index: number, self: this) => R,
    initialValue: R
  ): Promise<R>;
  /**
   * Depletes the cursor by applying the `reducer` function to each item in
   * the cursor's remaining result list. Returns the return value of `reducer`
   * for the last item.
   *
   * **Note**: If the result set spans multiple batches, any remaining batches
   * will only be fetched on demand. Depending on the cursor's TTL and the
   * processing speed, this may result in the server discarding the cursor
   * before it is fully depleted.
   *
   * See also:
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | `Array.prototype.reduce`}.
   *
   * @param R - Return type of the `reducer` function.
   * @param reducer - Function to execute on each element.
   *
   * @example
   * ```js
   * function largestOfTwo(one, two) {
   *   return Math.max(one, two);
   * }
   * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * const result = await cursor.reduce(largestOfTwo);
   * console.log(result); // 5
   * console.log(cursor.hasNext); // false
   * const emptyResult = await cursor.reduce(largestOfTwo);
   * console.log(emptyResult); // undefined
   * ```
   */
  async reduce<R>(
    reducer: (
      accumulator: T | R,
      currentValue: T,
      index: number,
      self: this
    ) => R
  ): Promise<R | undefined>;
  async reduce<R>(
    reducer: (accumulator: R, currentValue: T, index: number, self: this) => R,
    initialValue?: R
  ): Promise<R | undefined> {
    let index = 0;
    if (!this.hasNext) return initialValue;
    if (initialValue === undefined) {
      const value = (await this.next()) as any;
      initialValue = value as R;
      index += 1;
    }
    let value = initialValue;
    while (this.hasNext) {
      const item = await this.next();
      value = reducer(value, item!, index, this);
      index++;
    }
    return value;
  }

  /**
   * Kills the cursor and frees up associated database resources.
   *
   * This method has no effect if all batches have already been fetched.
   *
   * @example
   * ```js
   * const cursor1 = await db.query(aql`FOR x IN 1..5 RETURN x`);
   * console.log(cursor1.hasMore); // false
   * await cursor1.kill(); // no effect
   *
   * const cursor2 = await db.query(
   *   aql`FOR x IN 1..5 RETURN x`,
   *   { batchSize: 2 }
   * );
   * console.log(cursor2.hasMore); // true
   * await cursor2.kill(); // cursor is depleted
   * ```
   */
  async kill(): Promise<void> {
    return this.batches.kill();
  }
}
