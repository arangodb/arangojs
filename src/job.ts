import { Database } from "./database.js";
import { ArangojsResponse } from "./lib/request.js";

/**
 * Represents an async job in a {@link database.Database}.
 */
export class Job<T = any> {
  protected _id: string;
  protected _db: Database;
  protected _transformResponse?: (res: ArangojsResponse) => Promise<T>;
  protected _transformError?: (error: any) => Promise<T>;
  protected _loaded: boolean = false;
  protected _result: T | undefined;

  /**
   * @internal
   */
  constructor(
    db: Database,
    id: string,
    transformResponse?: (res: ArangojsResponse) => Promise<T>,
    transformError?: (error: any) => Promise<T>
  ) {
    this._db = db;
    this._id = id;
    this._transformResponse = transformResponse;
    this._transformError = transformError;
  }

  /**
   * Database this job belongs to.
   */
  get database() {
    return this._db;
  }

  /**
   * The job's ID.
   */
  get id(): string {
    return this._id;
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
      let res: ArangojsResponse;
      try {
        res = await this._db.request(
          {
            method: "PUT",
            path: `/_api/job/${this._id}`,
          },
          false
        );
      } catch (e) {
        if (this._transformError) {
          return this._transformError(e);
        }
        throw e;
      }
      if (res.status !== 204) {
        this._loaded = true;
        if (this._transformResponse) {
          this._result = await this._transformResponse(res);
        } else {
          this._result = res.parsedBody;
        }
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
      (res) => res.status !== 204
    );
  }
}
