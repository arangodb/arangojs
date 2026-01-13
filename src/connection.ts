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
import * as configuration from "./configuration.js";
import * as databases from "./databases.js";
import * as errors from "./errors.js";
import { ERROR_ARANGO_CONFLICT } from "./lib/codes.js";
import * as util from "./lib/util.js";
import { LinkedList } from "./lib/x3-linkedlist.js";

const MIME_JSON = /\/(json|javascript)(\W|$)/;
const LEADER_ENDPOINT_HEADER = "x-arango-endpoint";
const REASON_TIMEOUT = "timeout";

//#region Host
/**
 * @internal
 */
type Host = {
  /**
   * @internal
   *
   * Perform a fetch request against this host.
   *
   * @param pathname - URL path, relative to the server URL.
   * @param options - Options for this fetch request.
   */
  fetch: (
    options: Omit<
      RequestOptions,
      | "maxRetries"
      | "retryOnConflict"
      | "allowDirtyRead"
      | "hostUrl"
      | "expectBinary"
      | "isBinary"
    >
  ) => Promise<globalThis.Response & { request: globalThis.Request }>;
  /**
   * @internal
   *
   * Close the pending request, if any.
   */
  close: () => void;
};

/**
 * @internal
 *
 * Create a function for performing fetch requests against a given host.
 *
 * @param arangojsHostUrl - Base URL of the host, i.e. protocol, port and domain name.
 * @param options - Options to use for all fetch requests.
 */
function createHost(arangojsHostUrl: string, agentOptions?: any): Host {
  const baseUrl = new URL(arangojsHostUrl);
  let fetch = globalThis.fetch;
  let createDispatcher: (() => Promise<any>) | undefined;
  let dispatcher: any;
  let socketPath: string | undefined;
  if (arangojsHostUrl.match(/^\w+:\/\/unix:\//)) {
    socketPath = baseUrl.pathname;
    baseUrl.hostname = "localhost";
    baseUrl.pathname = "/";
    agentOptions = {
      ...agentOptions,
      connect: {
        ...agentOptions?.connect,
        socketPath,
      },
    };
  }
  if (agentOptions) {
    createDispatcher = async () => {
      let undici: any;
      try {
        // Prevent overzealous bundlers from attempting to bundle undici
        const undiciName = "undici";
        undici = await import(undiciName);
      } catch (cause) {
        if (socketPath) {
          throw new Error("Undici is required for Unix domain sockets", {
            cause,
          });
        }
        throw new Error("Undici is required when using config.agentOptions", {
          cause,
        });
      }
      fetch = undici.fetch;
      return new undici.Agent(agentOptions);
    };
  }
  const pending = new Map<string, AbortController>();
  return {
    async fetch({
      method,
      pathname,
      search,
      headers: requestHeaders,
      body,
      timeout,
      fetchOptions,
      beforeRequest,
      afterResponse,
    }: Omit<
      RequestOptions,
      | "maxRetries"
      | "retryOnConflict"
      | "allowDirtyRead"
      | "hostUrl"
      | "expectBinary"
      | "isBinary"
    >) {
      const url = new URL(pathname + baseUrl.search, baseUrl);
      if (search) {
        const searchParams =
          search instanceof URLSearchParams
            ? search
            : new URLSearchParams(search);
        for (const [key, value] of searchParams) {
          url.searchParams.append(key, value);
        }
      }
      const headers = new Headers(requestHeaders);
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
      if (createDispatcher) {
        dispatcher = await createDispatcher();
        createDispatcher = undefined;
      }
      const request = new Request(url, {
        ...fetchOptions,
        dispatcher,
        method,
        headers,
        body,
        signal,
      } as globalThis.RequestInit);
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
        response = Object.assign(await fetch(request), {
          request,
          arangojsHostUrl,
        });
        if (fetchOptions?.redirect === "manual" && isRedirect(response)) {
          throw new errors.HttpError(response);
        }
      } catch (e: unknown) {
        const cause = e instanceof Error ? e : new Error(String(e));
        let error: errors.NetworkError;
        if (cause instanceof errors.NetworkError) {
          error = cause;
        } else if (signal.aborted) {
          const reason =
            typeof signal.reason == "string" ? signal.reason : undefined;
          if (reason === REASON_TIMEOUT) {
            error = new errors.ResponseTimeoutError(undefined, request, {
              cause,
            });
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
  };
}
//#endregion

//#region Response types
const STATUS_CODE_DEFAULT_MESSAGES = {
  0: "Network Error",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "Request-URI Too Long",
  415: "Unsupported Media Type",
  416: "Requested Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  444: "Connection Closed Without Response",
  451: "Unavailable For Legal Reasons",
  499: "Client Closed Request",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
  599: "Network Connect Timeout Error",
};

type KnownStatusCode = keyof typeof STATUS_CODE_DEFAULT_MESSAGES;
const KNOWN_STATUS_CODES = Object.keys(STATUS_CODE_DEFAULT_MESSAGES).map((k) =>
  Number(k)
) as KnownStatusCode[];
const REDIRECT_CODES = [301, 302, 303, 307, 308] satisfies KnownStatusCode[];
type RedirectStatusCode = (typeof REDIRECT_CODES)[number];

/**
 * @internal
 *
 * Indicates whether the given status code can be translated to a known status
 * message.
 */
function isKnownStatusCode(code: number): code is KnownStatusCode {
  return KNOWN_STATUS_CODES.includes(code as KnownStatusCode);
}

/**
 * @internal
 *
 * Indicates whether the given status code represents a redirect.
 */
function isRedirect(response: ProcessedResponse): boolean {
  return REDIRECT_CODES.includes(response.status as RedirectStatusCode);
}

/**
 * Returns the status message for the given response's status code or the
 * status text of the response.
 */
export function getStatusMessage(response: ProcessedResponse): string {
  if (isKnownStatusCode(response.status)) {
    return STATUS_CODE_DEFAULT_MESSAGES[response.status];
  }
  if (response.statusText) return response.statusText;
  return "Unknown response status";
}

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
 * Indicates whether the given value represents an ArangoDB error response.
 */
export function isArangoErrorResponse(
  body: unknown
): body is ArangoErrorResponse {
  if (!body || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  return (
    obj.error === true &&
    typeof obj.errorMessage === "string" &&
    typeof obj.errorNum === "number" &&
    (obj.code === undefined || typeof obj.code === "number")
  );
}

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
  code?: number;
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
};

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
}
//#endregion

//#region Request options
/**
 * Options available for requests made with the Fetch API.
 */
export type CommonFetchOptions = {
  /**
   * Headers object containing any additional headers to send with the request.
   *
   * Note that the `Authorization` header will be overridden if the `auth`
   * configuration option is set.
   */
  headers?:
    | string[][]
    | Record<string, string | ReadonlyArray<string>>
    | Headers;
  /**
   * Controls whether the socket should be reused for subsequent requests.
   *
   * Default: `false`
   */
  keepalive?: boolean;
  /**
   * Controls what to do when the response status code is a redirect.
   *
   * - `"error"`: Abort with a network error.
   * - `"follow"`: Automatically follow redirects.
   * - `"manual"`: Abort with an `HttpError`.
   *
   * Default: `"follow"`
   */
  redirect?: "error" | "follow" | "manual";
  /**
   * Value to use for the `Referer` header.
   *
   * If set to `"about:client"`, the default value for the context in which the
   * request is made will be used.
   *
   * Default: `"about:client"`
   */
  referrer?: string;
  /**
   * (Browser only.) Controls the Attribution Reporting API specific behavior.
   *
   * See the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
   * for more information on the available options.
   */
  attributionReporting?: any;
  /**
   * (Browser only.) Cache mode to use for the request.
   *
   * See [the Fetch API specification](https://fetch.spec.whatwg.org/#request-class)
   * or the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
   * for more information on the available options.
   */
  cache?: string;
  /**
   * (Browser only.) Controls sending of credentials and cookies.
   *
   * - `"omit"`: Never send cookies.
   * - `"include"`: Always send cookies.
   * - `"same-origin"`: Only send cookies if the request is to the same origin.
   *
   * Default: `"same-origin"`
   */
  credentials?: "omit" | "include" | "same-origin";
  /**
   * (Node.js only.) Undici `Dispatcher` instance to use for the request.
   *
   * Defaults to the global dispatcher.
   */
  dispatcher?: any;
  /**
   * (Browser only.) Sets cross-origin behavior for the request.
   *
   * See [the Fetch API specification](https://fetch.spec.whatwg.org/#request-class)
   * or the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
   * for more information on the available options.
   *
   * Default: `"cors"`
   */
  mode?: string;
  /**
   * (Browser only.) Request priority relative to other requests of the same type.
   *
   * See [the Fetch API specification](https://fetch.spec.whatwg.org/#request-class)
   * or the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
   * for more information on the available options.
   *
   * Default: `"auto"`
   */
  priority?: "low" | "high" | "auto";
  /**
   * (Browser only.) Policy to use for the `Referer` header, equivalent to the
   * semantics of the `Referrer-Policy` header.
   *
   * See [the Fetch API specification](https://fetch.spec.whatwg.org/#request-class)
   * or the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
   * for more information on the available options.
   */
  referrerPolicy?: string;
};

/**
 * Fetch-specific options for performing a request with arangojs.
 */
export type FetchOptions = CommonFetchOptions & {
  /**
   * Subresource integrity value to use for the request, formatted as
   * `<hash-algorithm>-<hash-source>`.
   */
  integrity?: `${string}-${string}`;
};

/**
 * Options that can be shared globally for all requests made with arangojs.
 */
export type CommonRequestOptions = {
  /**
   * Determines the behavior when a request fails because the underlying
   * connection to the server could not be opened
   * (e.g. [`ECONNREFUSED` in Node.js](https://nodejs.org/api/errors.html#errors_common_system_errors)):
   *
   * - `false`: the request fails immediately.
   *
   * - `0`: the request is retried until a server can be reached but only a
   *   total number of times matching the number of known servers (including
   *   the initial failed request).
   *
   * - any other number: the request is retried until a server can be reached
   *   or the request has been retried a total of `maxRetries` number of times
   *   (not including the initial failed request).
   *
   * When working with a single server, the retries (if any) will be made to
   * the same server.
   *
   * This setting currently has no effect when using arangojs in a browser.
   *
   * **Note**: Requests bound to a specific server (e.g. fetching query results)
   * will never be retried automatically and ignore this setting.
   *
   * **Note**: To set the number of retries when a write-write conflict is
   * encountered, see `retryOnConflict` instead.
   *
   * Default: `0`
   */
  maxRetries?: false | number;
  /**
   * If set to a positive number, requests will automatically be retried at
   * most this many times if they result in a write-write conflict.
   *
   * Default: `0`
   */
  retryOnConflict?: number;
  /**
   * Time in milliseconds after which arangojs will abort the request if the
   * socket has not already timed out.
   */
  timeout?: number;
  /**
   * Whether ArangoDB is allowed to perform a dirty read to respond to the
   * request. If set to `true`, the response may reflect a dirty state from
   * a non-authoritative server.
   *
   * Default: `false`
   */
  allowDirtyRead?: boolean;
  /**
   * Callback that will be invoked with the finished request object before it
   * is finalized. In the browser the request may already have been sent.
   *
   * @param req - Request object or XHR instance used for this request.
   */
  beforeRequest?: (req: globalThis.Request) => void | Promise<void>;
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
  afterResponse?: (
    err: errors.NetworkError | null,
    res?: globalThis.Response & { request: globalThis.Request }
  ) => void | Promise<void>;
};

/**
 * Options for performing a request with arangojs.
 */
export type RequestOptions = CommonRequestOptions & {
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
   * URL path, relative to the server domain.
   */
  pathname?: string;
  /**
   * URL parameters to pass as part of the query string.
   */
  search?: URLSearchParams | Record<string, any>;
  /**
   * Headers object containing any additional headers to send with the request.
   *
   * Note that the `Authorization` header will be overridden if the `auth`
   * configuration option is set.
   */
  headers?:
    | string[][]
    | Record<string, string | ReadonlyArray<string>>
    | Headers;
  /**
   * Request body data.
   */
  body?: any;
  /**
   * Additional options to pass to the `fetch` function.
   */
  fetchOptions?: Omit<FetchOptions, "headers">;
  /**
   * If set to `true`, the request body will not be converted to JSON and
   * instead passed as-is.
   */
  isBinary?: boolean;
  /**
   * If set to `true`, the response body will not be interpreted as JSON and
   * instead passed as-is.
   */
  expectBinary?: boolean;
};
//#endregion

//#region Connection class
/**
 * @internal
 */
type Task<T = any> = {
  stack?: () => string;
  resolve: (result: T) => void;
  reject: (error: unknown) => void;
  transform?: (res: ProcessedResponse<any>) => T;
  retries: number;
  conflicts: number;
  options: RequestOptions;
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
  protected _arangoVersion: number;
  protected _loadBalancingStrategy: configuration.LoadBalancingStrategy;
  protected _taskPoolSize: number;
  protected _commonRequestOptions: CommonRequestOptions;
  protected _commonFetchOptions: CommonFetchOptions & { headers: Headers };
  protected _queue = new LinkedList<Task>();
  protected _databases = new Map<string, databases.Database>();
  protected _hosts: Host[] = [];
  protected _hostUrls: string[] = [];
  protected _activeHostUrl: string;
  protected _activeDirtyHostUrl: string;
  protected _transactionId: string | null = null;
  protected _onError?: (err: Error) => void | Promise<void>;
  protected _precaptureStackTraces: boolean;
  protected _queueTimes = new LinkedList<[number, number]>();
  protected _responseQueueTimeSamples: number;
  protected _agentOptions?: any;

  /**
   * @internal
   *
   * Creates a new `Connection` instance.
   *
   * @param config - An object with configuration options.
   *
   */
  constructor(config: Omit<configuration.ConfigOptions, "databaseName"> = {}) {
    const {
      url = "http://127.0.0.1:8529",
      auth,
      arangoVersion = 31100,
      loadBalancingStrategy = "NONE",
      maxRetries = 0,
      poolSize = 3 *
        (loadBalancingStrategy === "ROUND_ROBIN" && Array.isArray(url)
          ? url.length
          : 1),
      fetchOptions: { headers, ...commonFetchOptions } = {},
      agentOptions,
      onError,
      precaptureStackTraces = false,
      responseQueueTimeSamples = 10,
      ...commonRequestOptions
    } = config;
    const URLS = Array.isArray(url) ? url : [url];
    this._loadBalancingStrategy = loadBalancingStrategy;
    this._precaptureStackTraces = precaptureStackTraces;
    this._responseQueueTimeSamples =
      responseQueueTimeSamples < 0 ? Infinity : responseQueueTimeSamples;
    this._arangoVersion = arangoVersion;
    this._taskPoolSize = poolSize;
    this._onError = onError;
    this._agentOptions = agentOptions;

    this._commonRequestOptions = commonRequestOptions;
    this._commonFetchOptions = {
      headers: new Headers(headers),
      ...commonFetchOptions,
    };

    this._commonFetchOptions.headers.set(
      "x-arango-version",
      String(arangoVersion)
    );
    this._commonFetchOptions.headers.set(
      "x-arango-driver",
      `arangojs/${process.env.ARANGOJS_VERSION} (cloud)`
    );

    this.addToHostList(URLS);

    if (auth) {
      if (configuration.isBearerAuth(auth)) {
        this.setBearerAuth(auth);
      } else {
        this.setBasicAuth(auth);
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
      if (task.options.hostUrl !== undefined) {
        hostUrl = task.options.hostUrl;
      } else if (task.options.allowDirtyRead) {
        hostUrl = this._activeDirtyHostUrl;
        const i = this._hostUrls.indexOf(this._activeDirtyHostUrl) + 1;
        this._activeDirtyHostUrl = this._hostUrls[i % this._hostUrls.length];
      } else if (this._loadBalancingStrategy === "ROUND_ROBIN") {
        const i = this._hostUrls.indexOf(this._activeHostUrl) + 1;
        this._activeHostUrl = this._hostUrls[i % this._hostUrls.length];
      }
      const host = this._hosts[this._hostUrls.indexOf(hostUrl)];
      const res: globalThis.Response & {
        request: globalThis.Request;
        arangojsHostUrl: string;
        parsedBody?: any;
      } = Object.assign(await host.fetch(task.options), {
        arangojsHostUrl: hostUrl,
      });
      const leaderEndpoint = res.headers.get(LEADER_ENDPOINT_HEADER);
      if (res.status === 503 && leaderEndpoint) {
        const [cleanUrl] = this.addToHostList(leaderEndpoint);
        task.options.hostUrl = cleanUrl;
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
          if (isArangoErrorResponse(errorBody)) {
            res.parsedBody = errorBody;
            throw errors.ArangoError.from(res);
          }
        }
        throw new errors.HttpError(res);
      }
      if (res.body) {
        if (task.options.expectBinary) {
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
        !task.options.allowDirtyRead &&
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
        task.options.retryOnConflict &&
        task.conflicts < task.options.retryOnConflict
      ) {
        task.conflicts += 1;
        this._queue.push(task);
        return;
      }
      if (
        (errors.isNetworkError(err) || errors.isArangoError(err)) &&
        err.isSafeToRetry &&
        task.options.hostUrl === undefined &&
        this._commonRequestOptions.maxRetries !== false &&
        task.retries <
          (this._commonRequestOptions.maxRetries || this._hosts.length - 1)
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
  database(
    databaseName: string,
    database: databases.Database
  ): databases.Database;
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
        return createHost(url, this._agentOptions);
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
    this._hosts.push(...newUrls.map((url) => createHost(url, this._agentOptions)));
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
      this._commonFetchOptions.headers.delete(headerName);
    } else {
      this._commonFetchOptions.headers.set(headerName, value);
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
          throw new errors.PropagationTimeoutError(undefined, {
            cause: e as Error,
          });
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
  async request<
    T = globalThis.Response & { request: globalThis.Request; parsedBody?: any },
  >(
    requestOptions: RequestOptions & { isBinary?: boolean },
    transform?: (
      res: globalThis.Response & {
        request: globalThis.Request;
        parsedBody?: any;
      }
    ) => T
  ): Promise<T> {
    const {
      hostUrl,
      allowDirtyRead = false,
      isBinary = false,
      maxRetries = 0,
      method = "GET",
      retryOnConflict = 0,
      timeout = 0,
      headers: requestHeaders,
      body: requestBody,
      fetchOptions,
      ...taskOptions
    } = { ...this._commonRequestOptions, ...requestOptions };

    const headers = util.mergeHeaders(
      this._commonFetchOptions.headers,
      requestHeaders
    );

    let body = requestBody;
    if (body instanceof FormData) {
      const res = new Response(body);
      const blob = await res.blob();
      // Workaround for ArangoDB 3.12.0-rc1 and earlier:
      // Omitting the final CRLF results in "bad request body" fatal error
      body = new Blob([blob, "\r\n"], { type: blob.type });
    } else if (body) {
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

    return new Promise((resolve, reject) => {
      const task: Task = {
        resolve,
        reject,
        transform,
        retries: 0,
        conflicts: 0,
        options: {
          ...taskOptions,
          hostUrl,
          method,
          headers,
          body,
          allowDirtyRead,
          retryOnConflict,
          maxRetries,
          fetchOptions,
          timeout,
        },
      };

      if (this._precaptureStackTraces) {
        if (typeof Error.captureStackTrace === "function") {
          const capture = {} as { readonly stack: string };
          Error.captureStackTrace(capture);
          task.stack = () =>
            `\n${capture.stack.split("\n").slice(3).join("\n")}`;
        } else {
          const capture = util.generateStackTrace() as {
            readonly stack: string;
          };
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
