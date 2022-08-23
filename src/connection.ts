/**
 * ```ts
 * import type { Config } from "arangojs/connection";
 * ```
 *
 * The "connection" module provides connection and configuration related types
 * for TypeScript.
 *
 * @packageDocumentation
 */
import { ClientRequest } from "http";
import { AgentOptions as NodeAgentOptions } from "https";
import { LinkedList } from "x3-linkedlist";
import { Database } from "./database";
import {
  ArangoError,
  HttpError,
  isArangoError,
  isArangoErrorResponse,
  isSystemError,
} from "./error";
import { base64Encode } from "./lib/btoa";
import {
  ERROR_ARANGO_CONFLICT,
  ERROR_ARANGO_MAINTENANCE_MODE,
} from "./lib/codes";
import { Errback } from "./lib/errback";
import { normalizeUrl } from "./lib/normalizeUrl";
import { querystringify } from "./lib/querystringify";
import {
  ArangojsError,
  ArangojsResponse,
  createRequest,
  isBrowser,
  RequestFunction,
} from "./lib/request";

const MIME_JSON = /\/(json|javascript)(\W|$)/;
const LEADER_ENDPOINT_HEADER = "x-arango-endpoint";

/**
 * Determines the behavior when multiple URLs are used:
 *
 * - `"NONE"`: No load balancing. All requests will be handled by the first
 *   URL in the list until a network error is encountered. On network error,
 *   arangojs will advance to using the next URL in the list.
 *
 * - `"ONE_RANDOM"`: Randomly picks one URL from the list initially, then
 *   behaves like `"NONE"`.
 *
 * - `"ROUND_ROBIN"`: Every sequential request uses the next URL in the list.
 */
export type LoadBalancingStrategy = "NONE" | "ROUND_ROBIN" | "ONE_RANDOM";

/**
 * An arbitrary object with string values representing HTTP headers and their
 * values.
 *
 * Header names should always be lowercase.
 */
export type Headers = Record<string, string>;

/**
 * An arbitrary object with scalar values representing query string parameters
 * and their values.
 */
export type Params = Record<string, any>;

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
 * Credentials for HTTP Basic authentication.
 */
export type BasicAuthCredentials = {
  /**
   * Username to use for authentication, e.g. `"root"`.
   */
  username: string;
  /**
   * Password to use for authentication. Defaults to an empty string.
   */
  password?: string;
};

/**
 * Credentials for HTTP Bearer token authentication.
 */
export type BearerAuthCredentials = {
  /**
   * Bearer token to use for authentication.
   */
  token: string;
};

function isBearerAuth(auth: any): auth is BearerAuthCredentials {
  return auth.hasOwnProperty("token");
}

/**
 * @internal
 */
function generateStackTrace() {
  let err = new Error();
  if (!err.stack) {
    try {
      throw err;
    } catch (e: any) {
      err = e;
    }
  }
  return err;
}

/**
 * @internal
 */
type UrlInfo = {
  absolutePath?: boolean;
  basePath?: string;
  path?: string;
  qs?: string | Params;
};

/**
 * Options of the `xhr` module that can be set using `agentOptions` when using
 * arangojs in the browser. Additionally `maxSockets` can be used to control
 * the maximum number of parallel requests.
 *
 * See also: [`xhr` on npm](https://www.npmjs.com/package/xhr).
 */
export type XhrOptions = {
  /**
   * Maximum number of parallel requests arangojs will perform. If any
   * additional requests are attempted, they will be enqueued until one of the
   * active requests has completed.
   */
  maxSockets?: number;
  /**
   * Number of milliseconds to wait for a response.
   *
   * Default: `0` (disabled)
   */
  timeout?: number;
  /**
   * Callback that will be invoked immediately before the `send` method of the
   * request is called.
   *
   * See also {@link RequestInterceptors}.
   */
  beforeSend?: (xhrObject: any) => void;
  /**
   * `XMLHttpRequest` object to use instead of the native implementation.
   */
  xhr?: any;
  /**
   * (Internet Explorer 10 and lower only.) Whether `XDomainRequest` should be
   * used instead of `XMLHttpRequest`. Only required for performing
   * cross-domain requests in older versions of Internet Explorer.
   */
  useXdr?: boolean;
  /**
   * Specifies whether browser credentials (e.g. cookies) should be sent if
   * performing a cross-domain request.
   *
   * See [`XMLHttpRequest.withCredentials`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials).
   */
  withCredentials?: boolean;
};

/**
 * Additional options for intercepting the request/response. These methods
 * are primarily intended for tracking network related metrics.
 */
export type RequestInterceptors = {
  /**
   * Callback that will be invoked with the finished request object before it
   * is finalized. In the browser the request may already have been sent.
   *
   * @param req - Request object or XHR instance used for this request.
   */
  before?: (req: ClientRequest) => void;
  /**
   * Callback that will be invoked when the server response has been received
   * and processed or when the request has been failed without a response.
   *
   * The originating request will be available as the `request` property
   * on either the error or response object.
   *
   * @param err - Error encountered when handling this request or `null`.
   * @param res - Response object for this request, if no error occurred.
   */
  after?: (err: ArangojsError | null, res?: ArangojsResponse) => void;
};

/**
 * Options for performing a request with arangojs.
 */
export type RequestOptions = {
  /**
   * @internal
   *
   * Identifier of a specific ArangoDB host to use when more than one is known.
   */
  host?: number;
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
   * Default: `0`
   */
  retryOnConflict?: number;
  /**
   * HTTP headers to pass along with this request in addition to the default
   * headers generated by arangojs.
   */
  headers?: Headers;
  /**
   * Time in milliseconds after which arangojs will abort the request if the
   * socket has not already timed out.
   *
   * See also `agentOptions.timeout` in {@link Config}.
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
  qs?: string | Params;
};

/**
 * @internal
 */
type Task = {
  host?: number;
  stack?: () => string;
  allowDirtyRead: boolean;
  retryOnConflict: number;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  transform?: (res: ArangojsResponse) => any;
  retries: number;
  options: {
    method: string;
    expectBinary: boolean;
    timeout?: number;
    url: { pathname: string; search?: string };
    headers: Headers;
    body: any;
  };
};

/**
 * Options for creating the Node.js `http.Agent` or `https.Agent`.
 *
 * In browser environments this option can be used to pass additional options
 * to the underlying calls of the
 * [xhr module](https://www.npmjs.com/package/xhr).
 *
 * See also [`http.Agent`](https://nodejs.org/api/http.html#http_new_agent_options)
 * and [`https.Agent`](https://nodejs.org/api/https.html#https_new_agent_options)
 * (when using TLS).
 */
export type AgentOptions = NodeAgentOptions | XhrOptions;

/**
 * Options for configuring arangojs.
 */
export type Config = {
  /**
   * Name of the database to use.
   *
   * Default: `"_system"`
   */
  databaseName?: string;
  /**
   * Base URL of the ArangoDB server or list of server URLs.
   *
   * When working with a cluster or a single server with leader/follower
   * failover, the method {@link database.Database#acquireHostList} can be used to
   * automatically pick up additional coordinators/followers at any point.
   *
   * When running ArangoDB on a unix socket, e.g. `/tmp/arangodb.sock`, the
   * following URL formats are supported for unix sockets:
   *
   * - `unix:///tmp/arangodb.sock` (no SSL)
   * - `http+unix:///tmp/arangodb.sock` (or `https+unix://` for SSL)
   * - `http://unix:/tmp/arangodb.sock` (or `https://unix:` for SSL)
   *
   * Additionally `ssl` and `tls` are treated as synonymous with `https` and
   * `tcp` is treated as synonymous with `http`, so the following URLs are
   * considered identical:
   *
   * - `tcp://127.0.0.1:8529` and `http://127.0.0.1:8529`
   * - `ssl://127.0.0.1:8529` and `https://127.0.0.1:8529`
   * - `tcp+unix:///tmp/arangodb.sock` and `http+unix:///tmp/arangodb.sock`
   * - `ssl+unix:///tmp/arangodb.sock` and `https+unix:///tmp/arangodb.sock`
   * - `tcp://unix:/tmp/arangodb.sock` and `http://unix:/tmp/arangodb.sock`
   * - `ssl://unix:/tmp/arangodb.sock` and `https://unix:/tmp/arangodb.sock`
   *
   * See also `auth` for passing authentication credentials.
   *
   * Default: `"http://127.0.0.1:8529"`
   */
  url?: string | string[];
  /**
   * Credentials to use for authentication.
   *
   * See also {@link database.Database#useBasicAuth} and
   * {@link database.Database#useBearerAuth}.
   *
   * Default: `{ username: "root", password: "" }`
   */
  auth?: BasicAuthCredentials | BearerAuthCredentials;
  /**
   * Numeric representation of the ArangoDB version the driver should expect.
   * The format is defined as `XYYZZ` where `X` is the major version, `Y` is
   * the zero-filled two-digit minor version and `Z` is the zero-filled two-digit
   * bugfix version, e.g. `30102` for 3.1.2, `20811` for 2.8.11.
   *
   * Depending on this value certain methods may become unavailable or change
   * their behavior to remain compatible with different versions of ArangoDB.
   *
   * Default: `30900`
   */
  arangoVersion?: number;
  /**
   * Determines the behavior when multiple URLs are provided:
   *
   * - `"NONE"`: No load balancing. All requests will be handled by the first
   *   URL in the list until a network error is encountered. On network error,
   *   arangojs will advance to using the next URL in the list.
   *
   * - `"ONE_RANDOM"`: Randomly picks one URL from the list initially, then
   *   behaves like `"NONE"`.
   *
   * - `"ROUND_ROBIN"`: Every sequential request uses the next URL in the list.
   *
   * Default: `"NONE"`
   */
  loadBalancingStrategy?: LoadBalancingStrategy;
  /**
   * Determines the behavior when a request fails because the underlying
   * connection to the server could not be opened
   * (i.e. [`ECONNREFUSED` in Node.js](https://nodejs.org/api/errors.html#errors_common_system_errors)):
   *
   * - `false`: the request fails immediately.
   *
   * - `0`: the request is retried until a server can be reached but only a
   *   total number of times matching the number of known servers (including
   *   the initial failed request).
   *
   * - any other number: the request is retried until a server can be reached
   *   the request has been retried a total of `maxRetries` number of times
   *   (not including the initial failed request).
   *
   * When working with a single server without leader/follower failover, the
   * retries (if any) will be made to the same server.
   *
   * This setting currently has no effect when using arangojs in a browser.
   *
   * **Note**: Requests bound to a specific server (e.g. fetching query results)
   * will never be retried automatically and ignore this setting.
   *
   * Default: `0`
   */
  maxRetries?: false | number;
  /**
   * An http `Agent` instance to use for connections.
   *
   * By default a new `Agent` instance will be created using the `agentOptions`.
   *
   * This option has no effect when using the browser version of arangojs.
   *
   * See also [`http.Agent`](https://nodejs.org/api/http.html#http_new_agent_options)
   * and [`https.Agent`](https://nodejs.org/api/https.html#https_new_agent_options)
   * (when using TLS).
   */
  agent?: any;
  /**
   * Options used to create that underlying HTTP/HTTPS `Agent` (or the `xhr`
   * module when using arangojs in the browser). This will be ignored if
   * `agent` is also provided.
   *
   * The option `maxSockets` is also used to limit how many requests
   * arangojs will perform concurrently. The maximum number of requests is
   * equal to `maxSockets`.
   *
   * **Note:** arangojs will limit the number of concurrent requests based on
   * this value even if an `agent` is provided.
   *
   * **Note:** when using `ROUND_ROBIN` load balancing and passing an array of
   * URLs in the `url` option, the default value of `maxSockets` will be set
   * to `3 * url.length` instead of `3`.
   *
   * Default (Node.js): `{ maxSockets: 3, keepAlive: true, keepAliveMsecs: 1000 }`
   *
   * Default (browser): `{ maxSockets: 3, useXDR: true, withCredentials: true }`
   */
  agentOptions?: AgentOptions & RequestInterceptors;
  /**
   * An object with additional headers to send with every request.
   *
   * If an `"authorization"` header is provided, it will be overridden when
   * using {@link database.Database#useBasicAuth}, {@link database.Database#useBearerAuth} or
   * the `auth` configuration option.
   */
  headers?: Headers;
  /**
   * If set to `true`, arangojs will generate stack traces every time a request
   * is initiated and augment the stack traces of any errors it generates.
   *
   * **Warning**: This will cause arangojs to generate stack traces in advance
   * even if the request does not result in an error. Generating stack traces
   * may negatively impact performance.
   */
  precaptureStackTraces?: boolean;
  /**
   * Limits the number of values of server-reported response queue times that
   * will be stored and accessible using {@link database.Database#queueTime}. If set to
   * a finite value, older values will be discarded to make room for new values
   * when that limit is reached.
   *
   * Default: `10`
   */
  responseQueueTimeSamples?: number;
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
  protected _agent?: any;
  protected _agentOptions: { [key: string]: any };
  protected _arangoVersion: number = 30900;
  protected _headers: Headers;
  protected _loadBalancingStrategy: LoadBalancingStrategy;
  protected _maxRetries: number | false;
  protected _maxTasks: number;
  protected _queue = new LinkedList<Task>();
  protected _databases = new Map<string, Database>();
  protected _hosts: RequestFunction[] = [];
  protected _urls: string[] = [];
  protected _activeHost: number;
  protected _activeDirtyHost: number;
  protected _transactionId: string | null = null;
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
  constructor(config: Omit<Config, "databaseName"> = {}) {
    const URLS = config.url
      ? Array.isArray(config.url)
        ? config.url
        : [config.url]
      : ["http://127.0.0.1:8529"];
    const MAX_SOCKETS =
      3 * (config.loadBalancingStrategy === "ROUND_ROBIN" ? URLS.length : 1);

    if (config.arangoVersion !== undefined) {
      this._arangoVersion = config.arangoVersion;
    }
    this._agent = config.agent;
    this._agentOptions = isBrowser
      ? { maxSockets: MAX_SOCKETS, ...config.agentOptions }
      : {
          maxSockets: MAX_SOCKETS,
          keepAlive: true,
          keepAliveMsecs: 1000,
          scheduling: "lifo",
          ...config.agentOptions,
        };
    this._maxTasks = this._agentOptions.maxSockets;
    this._headers = { ...config.headers };
    this._loadBalancingStrategy = config.loadBalancingStrategy ?? "NONE";
    this._precaptureStackTraces = Boolean(config.precaptureStackTraces);
    this._responseQueueTimeSamples = config.responseQueueTimeSamples ?? 10;
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
      if (isBearerAuth(config.auth)) {
        this.setBearerAuth(config.auth);
      } else {
        this.setBasicAuth(config.auth);
      }
    }

    if (this._loadBalancingStrategy === "ONE_RANDOM") {
      this._activeHost = Math.floor(Math.random() * this._hosts.length);
      this._activeDirtyHost = Math.floor(Math.random() * this._hosts.length);
    } else {
      this._activeHost = 0;
      this._activeDirtyHost = 0;
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

  get queueTime() {
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

  protected _runQueue() {
    if (!this._queue.length || this._activeTasks >= this._maxTasks) return;
    const task = this._queue.shift()!;
    let host = this._activeHost;
    if (task.host !== undefined) {
      host = task.host;
    } else if (task.allowDirtyRead) {
      host = this._activeDirtyHost;
      this._activeDirtyHost = (this._activeDirtyHost + 1) % this._hosts.length;
      task.options.headers["x-arango-allow-dirty-read"] = "true";
    } else if (this._loadBalancingStrategy === "ROUND_ROBIN") {
      this._activeHost = (this._activeHost + 1) % this._hosts.length;
    }
    this._activeTasks += 1;
    const callback: Errback<ArangojsResponse> = (err, res) => {
      this._activeTasks -= 1;
      if (!err && res) {
        if (res.statusCode === 503 && res.headers[LEADER_ENDPOINT_HEADER]) {
          const url = res.headers[LEADER_ENDPOINT_HEADER]!;
          const [index] = this.addToHostList(url);
          task.host = index;
          if (this._activeHost === host) {
            this._activeHost = index;
          }
          this._queue.push(task);
        } else {
          res.arangojsHostId = host;
          const contentType = res.headers["content-type"];
          const queueTime = res.headers["x-arango-queue-time-seconds"];
          if (queueTime) {
            this._queueTimes.push([Date.now(), Number(queueTime)]);
            while (this._responseQueueTimeSamples < this._queueTimes.length) {
              this._queueTimes.shift();
            }
          }
          let parsedBody: any = undefined;
          if (res.body.length && contentType && contentType.match(MIME_JSON)) {
            try {
              parsedBody = res.body;
              parsedBody = JSON.parse(parsedBody);
            } catch (e: any) {
              if (!task.options.expectBinary) {
                if (typeof parsedBody !== "string") {
                  parsedBody = res.body.toString("utf-8");
                }
                e.res = res;
                if (task.stack) {
                  e.stack += task.stack();
                }
                callback(e);
                return;
              }
            }
          } else if (res.body && !task.options.expectBinary) {
            parsedBody = res.body.toString("utf-8");
          } else {
            parsedBody = res.body;
          }
          if (isArangoErrorResponse(parsedBody)) {
            res.body = parsedBody;
            err = new ArangoError(res);
          } else if (res.statusCode && res.statusCode >= 400) {
            res.body = parsedBody;
            err = new HttpError(res);
          } else {
            if (!task.options.expectBinary) res.body = parsedBody;
            task.resolve(task.transform ? task.transform(res) : (res as any));
          }
        }
      }
      if (err) {
        if (
          !task.allowDirtyRead &&
          this._hosts.length > 1 &&
          this._activeHost === host &&
          this._loadBalancingStrategy !== "ROUND_ROBIN"
        ) {
          this._activeHost = (this._activeHost + 1) % this._hosts.length;
        }
        if (
          isArangoError(err) &&
          err.errorNum === ERROR_ARANGO_CONFLICT &&
          task.retryOnConflict > 0
        ) {
          task.retryOnConflict -= 1;
          this._queue.push(task);
        } else if (
          ((isSystemError(err) &&
            err.syscall === "connect" &&
            err.code === "ECONNREFUSED") ||
            (isArangoError(err) &&
              err.errorNum === ERROR_ARANGO_MAINTENANCE_MODE)) &&
          task.host === undefined &&
          this._maxRetries !== false &&
          task.retries < (this._maxRetries || this._hosts.length - 1)
        ) {
          task.retries += 1;
          this._queue.push(task);
        } else {
          if (task.stack) {
            err.stack += task.stack();
          }
          task.reject(err);
        }
      }
      this._runQueue();
    };
    try {
      this._hosts[host](task.options, callback);
    } catch (e: any) {
      callback(e);
    }
  }

  protected _buildUrl({ basePath, path, qs }: UrlInfo) {
    const pathname = `${basePath || ""}${path || ""}`;
    let search;
    if (qs) {
      if (typeof qs === "string") search = `?${qs}`;
      else search = `?${querystringify(qs)}`;
    }
    return search ? { pathname, search } : { pathname };
  }

  setBearerAuth(auth: BearerAuthCredentials) {
    this.setHeader("authorization", `Bearer ${auth.token}`);
  }

  setBasicAuth(auth: BasicAuthCredentials) {
    this.setHeader(
      "authorization",
      `Basic ${base64Encode(`${auth.username}:${auth.password}`)}`
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
   * Fetches a {@link database.Database} instance for the given database name from the
   * internal cache, if available.
   *
   * @param databaseName - Name of the database.
   */
  database(databaseName: string): Database | undefined;
  /**
   * @internal
   *
   * Adds a {@link database.Database} instance for the given database name to the
   * internal cache.
   *
   * @param databaseName - Name of the database.
   * @param database - Database instance to add to the cache.
   */
  database(databaseName: string, database: Database): Database;
  /**
   * @internal
   *
   * Clears any {@link database.Database} instance stored for the given database name
   * from the internal cache, if present.
   *
   * @param databaseName - Name of the database.
   * @param database - Must be `null`.
   */
  database(databaseName: string, database: null): undefined;
  database(
    databaseName: string,
    database?: Database | null
  ): Database | undefined {
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
   * Adds the given URL or URLs to the host list.
   *
   * See {@link Connection#acquireHostList}.
   *
   * @param urls - URL or URLs to add.
   */
  addToHostList(urls: string | string[]): number[] {
    const cleanUrls = (Array.isArray(urls) ? urls : [urls]).map((url) =>
      normalizeUrl(url)
    );
    const newUrls = cleanUrls.filter((url) => this._urls.indexOf(url) === -1);
    this._urls.push(...newUrls);
    this._hosts.push(
      ...newUrls.map((url: string) =>
        createRequest(url, this._agentOptions, this._agent)
      )
    );
    return cleanUrls.map((url) => this._urls.indexOf(url));
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
      delete this._headers[headerName];
    } else {
      this._headers[headerName] = value;
    }
  }

  /**
   * @internal
   *
   * Closes all open connections.
   *
   * See {@link database.Database#close}.
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
   * See {@link database.Database#waitForPropagation}.
   *
   * @param request - Request to perform against each coordinator.
   * @param timeout - Maximum number of milliseconds to wait for propagation.
   */
  async waitForPropagation(request: RequestOptions, timeout = Infinity) {
    const numHosts = this._hosts.length;
    const propagated = [] as number[];
    const started = Date.now();
    let host = 0;
    while (true) {
      if (propagated.length === numHosts) {
        return;
      }
      while (propagated.includes(host)) {
        host = (host + 1) % numHosts;
      }
      try {
        await this.request({ ...request, host });
      } catch (e: any) {
        if (started + timeout < Date.now()) {
          throw e;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      if (!propagated.includes(host)) {
        propagated.push(host);
      }
    }
  }

  /**
   * @internal
   *
   * Performs a request using the arangojs connection pool.
   */
  request<T = ArangojsResponse>(
    {
      host,
      method = "GET",
      body,
      expectBinary = false,
      isBinary = false,
      allowDirtyRead = false,
      retryOnConflict = 0,
      timeout = 0,
      headers,
      ...urlInfo
    }: RequestOptions,
    transform?: (res: ArangojsResponse) => T
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let contentType = "text/plain";
      if (isBinary) {
        contentType = "application/octet-stream";
      } else if (body) {
        if (typeof body === "object") {
          body = JSON.stringify(body);
          contentType = "application/json";
        } else {
          body = String(body);
        }
      }

      const extraHeaders: Headers = {
        ...this._headers,
        "content-type": contentType,
        "x-arango-version": String(this._arangoVersion),
      };

      if (this._transactionId) {
        extraHeaders["x-arango-trx-id"] = this._transactionId;
      }

      const task: Task = {
        retries: 0,
        host,
        allowDirtyRead,
        retryOnConflict,
        options: {
          url: this._buildUrl(urlInfo),
          headers: { ...extraHeaders, ...headers },
          timeout,
          method,
          expectBinary,
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
          const capture = generateStackTrace() as { readonly stack: string };
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
