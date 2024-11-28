/**
 * ```ts
 * import type { ArangoApiResponse } from "arangojs/connection";
 * ```
 *
 * The "connection" module provides connection related types for TypeScript.
 *
 * @packageDocumentation
 */
import * as administration from "./administration.js";
import * as configuration from "./config.js";
import * as databases from "./databases.js";
import * as errors from "./errors.js";
import * as util from "./lib/util.js";
import { LinkedList } from "./lib/x3-linkedlist.js";
import { ERROR_ARANGO_CONFLICT } from "./lib/codes.js";

const MIME_JSON = /\/(json|javascript)(\W|$)/;
const LEADER_ENDPOINT_HEADER = "x-arango-endpoint";
const REASON_TIMEOUT = 'timeout';

//#region ServerFetchFunction
/**
 * @internal
 */
type CreateServerFetchFunctionOptions = Omit<globalThis.RequestInit, "method" | "body" | "integrity" | "signal"> & {
  beforeRequest?: (req: globalThis.Request) => void | Promise<void>;
  afterResponse?: (err: errors.NetworkError | null, res?: globalThis.Response & { request: globalThis.Request }) => void | Promise<void>;
};

/**
 * @internal
 */
type ServerFetchFunction = {
  /**
   * @internal
   * 
   * Perform a fetch request against this host.
   * 
   * @param pathname - URL path, relative to the `basePath` and server domain.
   * @param options - Options for this fetch request.
   */
  (pathname: string, options: ServerFetchOptions): Promise<globalThis.Response & { request: globalThis.Request }>;
  /**
   * @internal
   * 
   * Close the pending request, if any.
   */
  close: () => void;
};

/**
 * @internal
 */
type ServerFetchOptions = Omit<globalThis.RequestInit, "signal"> & {
  search?: URLSearchParams;
  timeout?: number;
};

/**
 * @internal
 *
 * Create a function for performing fetch requests against a given host.
 *
 * @param baseUrl - Base URL of the host, i.e. protocol, port and domain name.
 * @param options - Options to use for all fetch requests.
 */
function createServerFetchFunction(
  baseUrl: URL,
  {
    beforeRequest,
    afterResponse,
    ...serverFetchOptions
  }: CreateServerFetchFunctionOptions
): ServerFetchFunction {
  const pending = new Map<string, AbortController>();
  return Object.assign(
    async function serverFetch(
      pathname: string,
      {
        search,
        body,
        timeout,
        ...fetchOptions
      }: ServerFetchOptions) {
      const url = new URL(pathname + baseUrl.search, baseUrl);
      if (search) {
        for (const [key, value] of search) {
          url.searchParams.append(key, value);
        }
      }
      if (body instanceof FormData) {
        const res = new Response(body);
        const blob = await res.blob();
        // Workaround for ArangoDB 3.12.0-rc1 and earlier:
        // Omitting the final CRLF results in "bad request body" fatal error
        body = new Blob([blob, "\r\n"], { type: blob.type });
      }
      const headers = util.mergeHeaders(serverFetchOptions.headers, fetchOptions.headers);
      if (!headers.has("authorization")) {
        headers.set(
          "authorization",
          `Basic ${btoa(
            `${baseUrl.username || "root"}:${baseUrl.password || ""}`
          )}`
        );
      }
      const abortController = new AbortController();
      const signal = abortController.signal;
      const request = new Request(url, {
        ...serverFetchOptions,
        ...fetchOptions,
        headers,
        body,
        signal,
      });
      if (beforeRequest) {
        const p = beforeRequest(request);
        if (p instanceof Promise) await p;
      }
      const requestId = util.generateRequestId();
      pending.set(requestId, abortController);
      let clearTimer: (() => void) | undefined;
      if (timeout) {
        clearTimer = util.createTimer(timeout, () => {
          clearTimer = undefined;
          abortController.abort(REASON_TIMEOUT);
        });
      }
      let response: globalThis.Response & { request: globalThis.Request };
      try {
        response = Object.assign(await fetch(request), { request });
      } catch (e: unknown) {
        const cause = e instanceof Error ? e : new Error(String(e));
        let error: errors.NetworkError;
        if (signal.aborted) {
          const reason = typeof signal.reason == 'string' ? signal.reason : undefined;
          if (reason === REASON_TIMEOUT) {
            error = new errors.ResponseTimeoutError(undefined, request, { cause });
          } else {
            error = new errors.RequestAbortedError(reason, request, { cause });
          }
        } else if (cause instanceof TypeError) {
          error = new errors.FetchFailedError(undefined, request, { cause });
        } else {
          error = new errors.NetworkError(cause.message, request, { cause });
        }
        if (afterResponse) {
          const p = afterResponse(error);
          if (p instanceof Promise) await p;
        }
        throw error;
      } finally {
        clearTimer?.();
        pending.delete(requestId);
      }
      if (afterResponse) {
        const p = afterResponse(null, response);
        if (p instanceof Promise) await p;
      }
      return response;
    },
    {
      close() {
        if (!pending.size) return;
        const controllers = [...pending.values()];
        pending.clear();
        for (const controller of controllers) {
          try {
            controller.abort();
          } catch (e) {
            // noop
          }
        }
      },
    }
  );
}
//#endregion

//#region Response types
/**
 * Generic properties shared by all ArangoDB HTTP API responses.
 */
export type ArangoResponseMetadata = {
  /**
   * Indicates that the request was successful.
   */
  error: false;
  /**
   * Response status code, typically `200`.
   */
  code: number;
};

/**
 * Extends the given base type `T` with the generic HTTP API response properties.
 */
export type ArangoApiResponse<T> = T & ArangoResponseMetadata;

/**
 * Interface representing an ArangoDB error response.
 */
export type ArangoErrorResponse = {
  /**
   * Indicates that the request resulted in an error.
   */
  error: true;
  /**
   * Intended response status code as provided in the response body.
   */
  code: number;
  /**
   * Error message as provided in the response body.
   */
  errorMessage: string;
  /**
   * ArangoDB error code as provided in the response body.
   *
   * See the [ArangoDB error documentation](https://docs.arangodb.com/stable/develop/error-codes-and-meanings/)
   * for more information.
   */
  errorNum: number;
}

/**
 * Processed response object.
 */
export interface ProcessedResponse<T = any> extends globalThis.Response {
  /**
   * @internal
   *
   * Identifier of the ArangoDB host that served this request.
   */
  arangojsHostUrl?: string;
  /**
   * Fetch request object.
   */
  request: globalThis.Request;
  /**
   * Parsed response body.
   */
  parsedBody?: T;
};
//#endregion

//#region Request options
/**
 * Options for performing a request with arangojs.
 */
export type RequestOptions = {
  /**
   * @internal
   *
   * Identifier of a specific ArangoDB host to use when more than one is known.
   */
  hostUrl?: string;
  /**
   * HTTP method to use in order to perform the request.
   *
   * Default: `"GET"`
   */
  method?: string;
  /**
   * Request body data.
   */
  body?: any;
  /**
   * If set to `true`, the response body will not be interpreted as JSON and
   * instead passed as-is.
   */
  expectBinary?: boolean;
  /**
   * If set to `true`, the request body will not be converted to JSON and
   * instead passed as-is.
   */
  isBinary?: boolean;
  /**
   * Whether ArangoDB is allowed to perform a dirty read to respond to this
   * request. If set to `true`, the response may reflect a dirty state from
   * a non-authoritative server.
   */
  allowDirtyRead?: boolean;
  /**
   * If set to a positive number, the request will automatically be retried at
   * most this many times if it results in a write-write conflict.
   *
   * Default: `config.retryOnConflict`
   */
  retryOnConflict?: number;
  /**
   * HTTP headers to pass along with this request in addition to the default
   * headers generated by arangojs.
   */
  headers?: Headers | Record<string, string>;
  /**
   * Time in milliseconds after which arangojs will abort the request if the
   * socket has not already timed out.
   */
  timeout?: number;
  /**
   * Optional prefix path to prepend to the `path`.
   */
  basePath?: string;
  /**
   * URL path, relative to the `basePath` and server domain.
   */
  path?: string;
  /**
   * URL parameters to pass as part of the query string.
   */
  search?: URLSearchParams | Record<string, any>;
};
//#endregion

//#region Connection class
/**
 * @internal
 */
type Task<T = any> = {
  hostUrl?: string;
  stack?: () => string;
  allowDirtyRead: boolean;
  retryOnConflict: number;
  resolve: (result: T) => void;
  reject: (error: unknown) => void;
  transform?: (res: ProcessedResponse<any>) => T;
  retries: number;
  expectBinary: boolean;
  pathname: string;
  options: ServerFetchOptions;
};

/**
 * Indicates whether the given value represents a {@link Connection}.
 *
 * @param connection - A value that might be a connection.
 *
 * @internal
 */
export function isArangoConnection(connection: any): connection is Connection {
  return Boolean(connection && connection.isArangoConnection);
}

/**
 * Represents a connection pool shared by one or more databases.
 *
 * @internal
 */
export class Connection {
  protected _activeTasks: number = 0;
  protected _arangoVersion: number = 31100;
  protected _headers: Headers;
  protected _loadBalancingStrategy: configuration.LoadBalancingStrategy;
  protected _maxRetries: number | false;
  protected _taskPoolSize: number;
  protected _requestConfig: CreateServerFetchFunctionOptions;
  protected _retryOnConflict: number;
  protected _queue = new LinkedList<Task>();
  protected _databases = new Map<string, databases.Database>();
  protected _hosts: ServerFetchFunction[] = [];
  protected _hostUrls: string[] = [];
  protected _activeHostUrl: string;
  protected _activeDirtyHostUrl: string;
  protected _transactionId: string | null = null;
  protected _onError?: (err: Error) => void | Promise<void>;
  protected _precaptureStackTraces: boolean;
  protected _queueTimes = new LinkedList<[number, number]>();
  protected _responseQueueTimeSamples: number;

  /**
   * @internal
   *
   * Creates a new `Connection` instance.
   *
   * @param config - An object with configuration options.
   *
   */
  constructor(config: Omit<configuration.Config, "databaseName"> = {}) {
    const URLS = config.url
      ? Array.isArray(config.url)
        ? config.url
        : [config.url]
      : ["http://127.0.0.1:8529"];
    const DEFAULT_POOL_SIZE =
      3 * (config.loadBalancingStrategy === "ROUND_ROBIN" ? URLS.length : 1);

    if (config.arangoVersion !== undefined) {
      this._arangoVersion = config.arangoVersion;
    }
    this._taskPoolSize = config.poolSize ?? DEFAULT_POOL_SIZE;
    this._requestConfig = {
      credentials: config.credentials ?? "same-origin",
      keepalive: config.keepalive ?? true,
      beforeRequest: config.beforeRequest,
      afterResponse: config.afterResponse,
    };
    this._headers = new Headers(config.headers);
    this._headers.set("x-arango-version", String(this._arangoVersion));
    this._headers.set(
      "x-arango-driver",
      `arangojs/${process.env.ARANGOJS_VERSION} (cloud)`
    );
    this._loadBalancingStrategy = config.loadBalancingStrategy ?? "NONE";
    this._precaptureStackTraces = Boolean(config.precaptureStackTraces);
    this._responseQueueTimeSamples = config.responseQueueTimeSamples ?? 10;
    this._retryOnConflict = config.retryOnConflict ?? 0;
    this._onError = config.onError;
    if (this._responseQueueTimeSamples < 0) {
      this._responseQueueTimeSamples = Infinity;
    }
    if (config.maxRetries === false) {
      this._maxRetries = false;
    } else {
      this._maxRetries = Number(config.maxRetries ?? 0);
    }

    this.addToHostList(URLS);

    if (config.auth) {
      if (configuration.isBearerAuth(config.auth)) {
        this.setBearerAuth(config.auth);
      } else {
        this.setBasicAuth(config.auth);
      }
    }

    if (this._loadBalancingStrategy === "ONE_RANDOM") {
      this._activeHostUrl =
        this._hostUrls[Math.floor(Math.random() * this._hostUrls.length)];
      this._activeDirtyHostUrl =
        this._hostUrls[Math.floor(Math.random() * this._hostUrls.length)];
    } else {
      this._activeHostUrl = this._hostUrls[0];
      this._activeDirtyHostUrl = this._hostUrls[0];
    }
  }

  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB connection.
   */
  get isArangoConnection(): true {
    return true;
  }

  get queueTime(): administration.QueueTimeMetrics {
    return {
      getLatest: () => this._queueTimes.last?.value[1],
      getValues: () => Array.from(this._queueTimes.values()),
      getAvg: () => {
        let avg = 0;
        for (const [, [, value]] of this._queueTimes) {
          avg += value / this._queueTimes.length;
        }
        return avg;
      },
    };
  }

  protected async _runQueue() {
    if (this._activeTasks >= this._taskPoolSize) return;
    const task = this._queue.shift();
    if (!task) return;
    let hostUrl = this._activeHostUrl;
    try {
      this._activeTasks += 1;
      if (task.hostUrl !== undefined) {
        hostUrl = task.hostUrl;
      } else if (task.allowDirtyRead) {
        hostUrl = this._activeDirtyHostUrl;
        const i = this._hostUrls.indexOf(this._activeDirtyHostUrl) + 1;
        this._activeDirtyHostUrl = this._hostUrls[i % this._hostUrls.length];
      } else if (this._loadBalancingStrategy === "ROUND_ROBIN") {
        const i = this._hostUrls.indexOf(this._activeHostUrl) + 1;
        this._activeHostUrl = this._hostUrls[i % this._hostUrls.length];
      }
      const res: globalThis.Response & {
        request: globalThis.Request;
        arangojsHostUrl: string;
        parsedBody?: any;
      } = Object.assign(await this._hosts[this._hostUrls.indexOf(hostUrl)](
        task.pathname,
        task.options
      ), { arangojsHostUrl: hostUrl });
      const leaderEndpoint = res.headers.get(LEADER_ENDPOINT_HEADER);
      if (res.status === 503 && leaderEndpoint) {
        const [cleanUrl] = this.addToHostList(leaderEndpoint);
        task.hostUrl = cleanUrl;
        if (this._activeHostUrl === hostUrl) {
          this._activeHostUrl = cleanUrl;
        }
        this._queue.push(task);
        return;
      }
      const queueTime = res.headers.get("x-arango-queue-time-seconds");
      if (queueTime) {
        this._queueTimes.push([Date.now(), Number(queueTime)]);
        while (this._responseQueueTimeSamples < this._queueTimes.length) {
          this._queueTimes.shift();
        }
      }
      const contentType = res.headers.get("content-type");
      if (res.status >= 400) {
        if (contentType?.match(MIME_JSON)) {
          const errorResponse = res.clone();
          let errorBody: any;
          try {
            errorBody = await errorResponse.json();
          } catch {
            // noop
          }
          if (errors.isArangoErrorResponse(errorBody)) {
            res.parsedBody = errorBody;
            throw errors.ArangoError.from(res);
          }
        }
        throw new errors.HttpError(res);
      }
      if (res.body) {
        if (task.expectBinary) {
          res.parsedBody = await res.blob();
        } else if (contentType?.match(MIME_JSON)) {
          res.parsedBody = await res.json();
        } else {
          res.parsedBody = await res.text();
        }
      }
      let result: any = res;
      if (task.transform) result = task.transform(res);
      task.resolve(result);
    } catch (e: unknown) {
      const err = e as Error;
      if (
        !task.allowDirtyRead &&
        this._hosts.length > 1 &&
        this._activeHostUrl === hostUrl &&
        this._loadBalancingStrategy !== "ROUND_ROBIN"
      ) {
        const i = this._hostUrls.indexOf(this._activeHostUrl) + 1;
        this._activeHostUrl = this._hostUrls[i % this._hostUrls.length];
      }
      if (
        errors.isArangoError(err) &&
        err.errorNum === ERROR_ARANGO_CONFLICT &&
        task.retryOnConflict > 0
      ) {
        task.retryOnConflict -= 1;
        this._queue.push(task);
        return;
      }
      if (
        (errors.isNetworkError(err) || errors.isArangoError(err)) &&
        err.isSafeToRetry &&
        task.hostUrl === undefined &&
        this._maxRetries !== false &&
        task.retries < (this._maxRetries || this._hosts.length - 1)
      ) {
        task.retries += 1;
        this._queue.push(task);
        return;
      }
      if (task.stack) {
        err.stack += task.stack();
      }
      if (this._onError) {
        try {
          const p = this._onError(err);
          if (p instanceof Promise) await p;
        } catch (e) {
          (e as Error).cause = err;
          task.reject(e);
          return;
        }
      }
      task.reject(err);
    } finally {
      this._activeTasks -= 1;
      setTimeout(() => this._runQueue(), 0);
    }
  }

  setBearerAuth(auth: configuration.BearerAuthCredentials) {
    this.setHeader("authorization", `Bearer ${auth.token}`);
  }

  setBasicAuth(auth: configuration.BasicAuthCredentials) {
    this.setHeader(
      "authorization",
      `Basic ${btoa(`${auth.username}:${auth.password}`)}`
    );
  }

  setResponseQueueTimeSamples(responseQueueTimeSamples: number) {
    if (responseQueueTimeSamples < 0) {
      responseQueueTimeSamples = Infinity;
    }
    this._responseQueueTimeSamples = responseQueueTimeSamples;
    while (this._responseQueueTimeSamples < this._queueTimes.length) {
      this._queueTimes.shift();
    }
  }

  /**
   * @internal
   *
   * Fetches a {@link databases.Database} instance for the given database name from the
   * internal cache, if available.
   *
   * @param databaseName - Name of the database.
   */
  database(databaseName: string): databases.Database | undefined;
  /**
   * @internal
   *
   * Adds a {@link databases.Database} instance for the given database name to the
   * internal cache.
   *
   * @param databaseName - Name of the database.
   * @param database - Database instance to add to the cache.
   */
  database(databaseName: string, database: databases.Database): databases.Database;
  /**
   * @internal
   *
   * Clears any {@link databases.Database} instance stored for the given database name
   * from the internal cache, if present.
   *
   * @param databaseName - Name of the database.
   * @param database - Must be `null`.
   */
  database(databaseName: string, database: null): undefined;
  database(
    databaseName: string,
    database?: databases.Database | null
  ): databases.Database | undefined {
    if (database === null) {
      this._databases.delete(databaseName);
      return undefined;
    }
    if (!database) {
      return this._databases.get(databaseName);
    }
    this._databases.set(databaseName, database);
    return database;
  }

  /**
   * @internal
   *
   * Replaces the host list with the given URLs.
   *
   * See {@link Connection#acquireHostList}.
   *
   * @param urls - URLs to use as host list.
   */
  setHostList(urls: string[]): void {
    const cleanUrls = urls.map((url) => util.normalizeUrl(url));
    this._hosts.splice(
      0,
      this._hosts.length,
      ...cleanUrls.map((url) => {
        const i = this._hostUrls.indexOf(url);
        if (i !== -1) return this._hosts[i];
        const parsedUrl = new URL(url);
        if (!parsedUrl.pathname.endsWith("/")) {
          parsedUrl.pathname += "/";
        }
        return createServerFetchFunction(parsedUrl, this._requestConfig);
      })
    );
    this._hostUrls.splice(0, this._hostUrls.length, ...cleanUrls);
  }

  /**
   * @internal
   *
   * Adds the given URL or URLs to the host list.
   *
   * See {@link Connection#acquireHostList}.
   *
   * @param urls - URL or URLs to add.
   */
  addToHostList(urls: string | string[]): string[] {
    const cleanUrls = (Array.isArray(urls) ? urls : [urls]).map((url) =>
      util.normalizeUrl(url)
    );
    const newUrls = cleanUrls.filter(
      (url) => this._hostUrls.indexOf(url) === -1
    );
    this._hostUrls.push(...newUrls);
    this._hosts.push(
      ...newUrls.map((url: string) => {
        const parsedUrl = new URL(url);
        if (!parsedUrl.pathname.endsWith("/")) {
          parsedUrl.pathname += "/";
        }
        return createServerFetchFunction(parsedUrl, this._requestConfig);
      })
    );
    return cleanUrls;
  }

  /**
   * @internal
   *
   * Sets the connection's active `transactionId`.
   *
   * While set, all requests will use this ID, ensuring the requests are executed
   * within the transaction if possible. Setting the ID manually may cause
   * unexpected behavior.
   *
   * See also {@link Connection#clearTransactionId}.
   *
   * @param transactionId - ID of the active transaction.
   */
  setTransactionId(transactionId: string) {
    this._transactionId = transactionId;
  }

  /**
   * @internal
   *
   * Clears the connection's active `transactionId`.
   */
  clearTransactionId() {
    this._transactionId = null;
  }

  /**
   * @internal
   *
   * Sets the header `headerName` with the given `value` or clears the header if
   * `value` is `null`.
   *
   * @param headerName - Name of the header to set.
   * @param value - Value of the header.
   */
  setHeader(headerName: string, value: string | null) {
    if (value === null) {
      this._headers.delete(headerName);
    } else {
      this._headers.set(headerName, value);
    }
  }

  /**
   * @internal
   *
   * Closes all open connections.
   *
   * See {@link databases.Database#close}.
   */
  close() {
    for (const host of this._hosts) {
      if (host.close) host.close();
    }
  }

  /**
   * @internal
   *
   * Waits for propagation.
   *
   * See {@link databases.Database#waitForPropagation}.
   *
   * @param request - Request to perform against each coordinator.
   * @param timeout - Maximum number of milliseconds to wait for propagation.
   */
  async waitForPropagation(request: RequestOptions, timeout = Infinity) {
    const numHosts = this._hosts.length;
    const propagated = [] as string[];
    const started = Date.now();
    const endOfTime = started + timeout;
    let index = 0;
    while (true) {
      if (propagated.length === numHosts) {
        return;
      }
      while (propagated.includes(this._hostUrls[index])) {
        index = (index + 1) % numHosts;
      }
      const hostUrl = this._hostUrls[index];
      try {
        await this.request({
          ...request,
          hostUrl,
          timeout: endOfTime - Date.now(),
        });
      } catch (e) {
        if (endOfTime < Date.now()) {
          throw new errors.PropagationTimeoutError(
            undefined,
            { cause: e as Error }
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      if (!propagated.includes(hostUrl)) {
        propagated.push(hostUrl);
      }
    }
  }

  /**
   * @internal
   *
   * Performs a request using the arangojs connection pool.
   */
  request<T = globalThis.Response & { request: globalThis.Request; parsedBody?: any }>(
    {
      hostUrl,
      method = "GET",
      body,
      expectBinary = false,
      isBinary = false,
      allowDirtyRead = false,
      retryOnConflict = this._retryOnConflict,
      timeout = 0,
      headers: requestHeaders,
      basePath,
      path,
      search: params,
    }: RequestOptions,
    transform?: (res: globalThis.Response & { request: globalThis.Request; parsedBody?: any }) => T
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const headers = util.mergeHeaders(this._headers, requestHeaders ?? {});

      if (body && !(body instanceof FormData)) {
        let contentType;
        if (isBinary) {
          contentType = "application/octet-stream";
        } else if (typeof body === "object") {
          body = JSON.stringify(body);
          contentType = "application/json";
        } else {
          body = String(body);
          contentType = "text/plain";
        }
        if (!headers.has("content-type")) {
          headers.set("content-type", contentType);
        }
      }

      if (this._transactionId) {
        headers.set("x-arango-trx-id", this._transactionId);
      }

      if (allowDirtyRead) {
        headers.set("x-arango-allow-dirty-read", "true");
      }

      const task: Task = {
        retries: 0,
        hostUrl,
        allowDirtyRead,
        retryOnConflict,
        expectBinary,
        pathname: util.joinPath(basePath, path) ?? "",
        options: {
          search:
            params &&
            (params instanceof URLSearchParams
              ? params
              : new URLSearchParams(params)),
          headers,
          timeout,
          method,
          body,
        },
        reject,
        resolve,
        transform,
      };

      if (this._precaptureStackTraces) {
        if (typeof Error.captureStackTrace === "function") {
          const capture = {} as { readonly stack: string };
          Error.captureStackTrace(capture);
          task.stack = () =>
            `\n${capture.stack.split("\n").slice(3).join("\n")}`;
        } else {
          const capture = util.generateStackTrace() as { readonly stack: string };
          if (Object.prototype.hasOwnProperty.call(capture, "stack")) {
            task.stack = () =>
              `\n${capture.stack.split("\n").slice(4).join("\n")}`;
          }
        }
      }

      this._queue.push(task);
      this._runQueue();
    });
  }
}
//#endregion