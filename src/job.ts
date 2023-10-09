import { Database } from "./database";

/**
 * Represents an async job in a {@link database.Database}.
 */
export class Job<T = any> {
  protected _id: string;
  protected _db: Database;
  protected _loaded: boolean = false;
  protected _result: T | undefined;

  /**
   * @internal
   */
  constructor(db: Database, id: string) {
    this._db = db;
    this._id = id;
  }

  /**
   * Whether the job's results have been loaded. If set to `true`, the job's
   * result can be accessed from {@link Job.result}.
   */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /**
   * The job's result if it has been loaded or `undefined` otherwise.
   */
  get result(): T | undefined {
    return this._result;
  }

  /**
   * Loads the job's result from the database if it is not already loaded.
   *
   * @example
   * ```js
   * // poll for the job to complete
   * while (!job.isLoaded) {
   *   await timeout(1000);
   *   const result = await job.load();
   *   console.log(result);
   * }
   * // job result is now loaded and can also be accessed from job.result
   * console.log(job.result);
   * ```
   */
  async load(): Promise<T | undefined> {
    if (!this.isLoaded) {
      const res = await this._db.request(
        {
          method: "PUT",
          path: `/_api/job/${this._id}`,
        },
        false
      );
      if (res.statusCode !== 204) {
        this._loaded = true;
        this._result = res.body;
      }
    }
    return this._result;
  }

  /**
   * Cancels the job if it is still running. Note that it may take some time to
   * actually cancel the job.
   */
  cancel(): Promise<void> {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/job/${this._id}/cancel`,
      },
      () => undefined
    );
  }

  /**
   * Deletes the result if it has not already been retrieved or deleted.
   */
  deleteResult(): Promise<void> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/job/${this._id}`,
      },
      () => undefined
    );
  }

  /**
   * Fetches the job's completion state.
   *
   * Returns `true` if the job has completed, `false` otherwise.
   *
   * @example
   * ```js
   * // poll for the job to complete
   * while (!(await job.getCompleted())) {
   *   await timeout(1000);
   * }
   * // job result is now available and can be loaded
   * await job.load();
   * console.log(job.result);
   * ```
   */
  getCompleted(): Promise<boolean> {
    return this._db.request(
      {
        path: `/_api/job/${this._id}`,
      },
      (res) => res.statusCode !== 204
    );
  }
}
