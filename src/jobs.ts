/**
 * ```ts
 * import type { Job } from "arangojs/jobs";
 * ```
 *
 * The "jobs" module provides job-related types for TypeScript.
 *
 * @packageDocumentation
 */
import * as connection from "./connection.js";
import * as databases from "./databases.js";

/**
 * Represents an async job in a {@link databases.Database}.
 *
 * @param ResultType - The type of the job's result.
 */
export class Job<ResultType = any> {
  protected _id: string;
  protected _db: databases.Database;
  protected _transformResponse?: (
    res: connection.ProcessedResponse,
  ) => Promise<ResultType>;
  protected _transformError?: (error: any) => Promise<ResultType>;
  protected _loaded: boolean = false;
  protected _result: ResultType | undefined;

  /**
   * @internal
   */
  constructor(
    db: databases.Database,
    id: string,
    transformResponse?: (
      res: connection.ProcessedResponse,
    ) => Promise<ResultType>,
    transformError?: (error: any) => Promise<ResultType>,
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
  get result(): ResultType | undefined {
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
  async load(): Promise<ResultType | undefined> {
    if (!this.isLoaded) {
      let res: connection.ProcessedResponse;
      try {
        res = await this._db.request(
          {
            method: "PUT",
            pathname: `/_api/job/${this._id}`,
          },
          false,
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
        pathname: `/_api/job/${this._id}/cancel`,
      },
      () => undefined,
    );
  }

  /**
   * Deletes the result if it has not already been retrieved or deleted.
   */
  deleteResult(): Promise<void> {
    return this._db.request(
      {
        method: "DELETE",
        pathname: `/_api/job/${this._id}`,
      },
      () => undefined,
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
        pathname: `/_api/job/${this._id}`,
      },
      (res) => res.status !== 204,
    );
  }
}
