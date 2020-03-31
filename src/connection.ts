import { stringify as querystringify } from "querystring";
import { LinkedList } from "x3-linkedlist";
import { ArangoError, HttpError } from "./error";
import {
  ArangojsResponse,
  createRequest,
  isBrowser,
  RequestFunction
} from "./util/request";
import { sanitizeUrl } from "./util/sanitizeUrl";
import { Errback } from "./util/types";

const MIME_JSON = /\/(json|javascript)(\W|$)/;
const LEADER_ENDPOINT_HEADER = "x-arango-endpoint";

export type LoadBalancingStrategy = "NONE" | "ROUND_ROBIN" | "ONE_RANDOM";

export interface ArangoResponseMetadata {
  [key: string]: any | undefined;
  error: false;
  code: number;
}

interface SystemError extends Error {
  code: string;
  errno: number | string;
  syscall: string;
}

function isSystemError(err: Error): err is SystemError {
  return (
    Object.getPrototypeOf(err) === Error.prototype &&
    err.hasOwnProperty("code") &&
    err.hasOwnProperty("errno") &&
    err.hasOwnProperty("syscall")
  );
}

function clean<T>(obj: T) {
  const result = {} as typeof obj;
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if (value === undefined) continue;
    (result as any)[key] = value;
  }
  return result;
}

type UrlInfo = {
  absolutePath?: boolean;
  basePath?: string;
  path?: string;
  qs?: string | { [key: string]: any };
};

export interface RequestOptions {
  host?: number;
  method?: string;
  body?: any;
  expectBinary?: boolean;
  isBinary?: boolean;
  allowDirtyRead?: boolean;
  headers?: { [key: string]: string };
  timeout?: number;
  basePath?: string;
  path?: string;
  qs?: string | { [key: string]: any };
}

/** @hidden @internal */
export interface Task {
  host?: number;
  allowDirtyRead: boolean;
  resolve: Function;
  reject: Function;
  retries: number;
  options: {
    method: string;
    expectBinary: boolean;
    timeout?: number;
    url: { pathname: string; search?: string };
    headers: { [key: string]: string };
    body: any;
  };
}

/** @hidden */
export interface ConnectionOptions {
  /**
    Default: `"http://localhost:8529"`

    Base URL of the ArangoDB server or list of server URLs.

    When working with a cluster or a single server with leader/follower
    failover, the method `db.acquireHostList` can be used to automatically
    pick up additional coordinators/followers at any point.

    When running ArangoDB on a unix socket, e.g. `/tmp/arangodb.sock`, the
    following URL formats are supported for unix sockets:

    - `unix:///tmp/arangodb.sock` (no SSL)
    - `http+unix:///tmp/arangodb.sock` (or `https+unix://` for SSL)
    - `http://unix:/tmp/arangodb.sock` (or `https://unix:` for SSL)

    Additionally `ssl` and `tls` are treated as synonymous with `https` and
    `tcp` is treated as synonymous with `http`, so the following URLs are
    considered identical:

    - `tcp://localhost:8529` and `http://localhost:8529`
    - `ssl://localhost:8529` and `https://localhost:8529`
    - `tcp+unix:///tmp/arangodb.sock` and `http+unix:///tmp/arangodb.sock`
    - `ssl+unix:///tmp/arangodb.sock` and `https+unix:///tmp/arangodb.sock`
    - `tcp://unix:/tmp/arangodb.sock` and `http://unix:/tmp/arangodb.sock`
    - `ssl://unix:/tmp/arangodb.sock` and `https://unix:/tmp/arangodb.sock`

    If you want to use ArangoDB with authentication, see
    {@link Database.useBasicAuth} and
    {@link Database.useBearerAuth}.
   */
  url?: string | string[];
  /**
    Default: `30400`

    Numeric representation of the ArangoDB version the driver should expect.
    The format is defined as `XYYZZ` where `X` is the major version, `Y` is
    the zero-filled two-digit minor version and `Z` is the zero-filled two-digit
    bugfix version, e.g. `30102` for 3.1.2, `20811` for 2.8.11.

    Depending on this value certain methods may become unavailable or change
    their behavior to remain compatible with different versions of ArangoDB.
   */
  arangoVersion?: number;
  /**
    Default: `"NONE"`

    Determines the behavior when multiple URLs are provided:

    - `"NONE"`: No load balancing. All requests will be handled by the first
      URL in the list until a network error is encountered. On network error,
      arangojs will advance to using the next URL in the list.

    - `"ONE_RANDOM"`: Randomly picks one URL from the list initially, then
      behaves like `"NONE"`.

    - `"ROUND_ROBIN"`: Every sequential request uses the next URL in the list.
   */
  loadBalancingStrategy?: LoadBalancingStrategy;
  /**
    Default: `0`

    Determines the behavior when a request fails because the underlying
    connection to the server could not be opened
    (i.e. {@link https://nodejs.org/api/errors.html#errors_common_system_errors | `ECONNREFUSED` in Node.js}):

    - `false`: the request fails immediately.

    - `0`: the request is retried until a server can be reached but only a
      total number of times matching the number of known servers (including
      the initial failed request).

    - any other number: the request is retried until a server can be reached
      the request has been retried a total of `maxRetries` number of times
      (not including the initial failed request).

    When working with a single server without leader/follower failover, the
    retries (if any) will be made to the same server.

    This setting currently has no effect when using arangojs in a browser.

    **Note**: Requests bound to a specific server (e.g. fetching query results)
    will never be retried automatically and ignore this setting.
   */
  maxRetries?: false | number;
  /**
    An http `Agent` instance to use for connections.

    By default a new
    {@link https://nodejs.org/api/http.html#http_new_agent_options | `http.Agent`}
    (or `https.Agent` for TLS) instance will be created using the `agentOptions`.

    This option has no effect when using the browser version of arangojs.
   */
  agent?: any;
  /**
    Default (Node.js): `{maxSockets: 3, keepAlive: true, keepAliveMsecs: 1000}`

    Default (Browser): `{maxSockets: 3, keepAlive: false}`

    An object with options for the agent. This will be ignored if `agent` is
    also provided.

    The option `maxSockets` can also be used to limit how many requests
    arangojs will perform concurrently. The maximum number of requests is
    equal to `maxSockets * 2` with `keepAlive: true` or
    equal to `maxSockets` with `keepAlive: false`.

    In the browser version of arangojs this option can be used to pass
    additional options to the underlying calls of the
    {@link https://www.npmjs.com/package/xhr | xhr module}.
   */
  agentOptions?: {
    [key: string]: any;
  };
  /**
    An object with additional headers to send with every request.

    Header names should always be lowercase. If an `"authorization"` header is
    provided, it will be overridden when using
    {@link Database.useBasicAuth} or {@link Database.useBearerAuth}.
   */
  headers?: {
    [key: string]: string;
  };
}

/** @hidden @internal */
export function isArangoConnection(connection: any): connection is Connection {
  return Boolean(connection && connection.isArangoConnection);
}

/** @hidden @internal */
export class Connection {
  protected _activeTasks: number = 0;
  protected _agent?: any;
  protected _agentOptions: { [key: string]: any };
  protected _arangoVersion: number = 30400;
  protected _headers: { [key: string]: string };
  protected _loadBalancingStrategy: LoadBalancingStrategy;
  protected _useFailOver: boolean;
  protected _shouldRetry: boolean;
  protected _maxRetries: number;
  protected _maxTasks: number;
  protected _queue = new LinkedList<Task>();
  protected _hosts: RequestFunction[] = [];
  protected _urls: string[] = [];
  protected _activeHost: number;
  protected _activeDirtyHost: number;
  protected _transactionId: string | null = null;

  constructor(config: ConnectionOptions = {}) {
    if (config.arangoVersion !== undefined) {
      this._arangoVersion = config.arangoVersion;
    }
    this._agent = config.agent;
    this._agentOptions = isBrowser
      ? { ...config.agentOptions! }
      : {
          maxSockets: 3,
          keepAlive: true,
          keepAliveMsecs: 1000,
          ...config.agentOptions
        };
    this._maxTasks = this._agentOptions.maxSockets || 3;
    if (this._agentOptions.keepAlive) this._maxTasks *= 2;

    this._headers = { ...config.headers };
    this._loadBalancingStrategy = config.loadBalancingStrategy || "NONE";
    this._useFailOver = this._loadBalancingStrategy !== "ROUND_ROBIN";
    if (config.maxRetries === false) {
      this._shouldRetry = false;
      this._maxRetries = 0;
    } else {
      this._shouldRetry = true;
      this._maxRetries = config.maxRetries || 0;
    }

    const urls = config.url
      ? Array.isArray(config.url)
        ? config.url
        : [config.url]
      : ["http://localhost:8529"];
    this.addToHostList(urls);

    if (this._loadBalancingStrategy === "ONE_RANDOM") {
      this._activeHost = Math.floor(Math.random() * this._hosts.length);
      this._activeDirtyHost = Math.floor(Math.random() * this._hosts.length);
    } else {
      this._activeHost = 0;
      this._activeDirtyHost = 0;
    }
  }

  get isArangoConnection(): true {
    return true;
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
      if (err) {
        if (
          !task.allowDirtyRead &&
          this._hosts.length > 1 &&
          this._activeHost === host &&
          this._useFailOver
        ) {
          this._activeHost = (this._activeHost + 1) % this._hosts.length;
        }
        if (
          !task.host &&
          this._shouldRetry &&
          task.retries < (this._maxRetries || this._hosts.length - 1) &&
          isSystemError(err) &&
          err.syscall === "connect" &&
          err.code === "ECONNREFUSED"
        ) {
          task.retries += 1;
          this._queue.push(task);
        } else {
          task.reject(err);
        }
      } else {
        const response = res!;
        if (
          response.statusCode === 503 &&
          response.headers[LEADER_ENDPOINT_HEADER]
        ) {
          const url = response.headers[LEADER_ENDPOINT_HEADER]!;
          const [index] = this.addToHostList(url);
          task.host = index;
          if (this._activeHost === host) {
            this._activeHost = index;
          }
          this._queue.push(task);
        } else {
          response.arangojsHostId = host;
          task.resolve(response);
        }
      }
      this._runQueue();
    };
    try {
      this._hosts[host](task.options, callback);
    } catch (e) {
      callback(e);
    }
  }

  protected _buildUrl({ basePath, path, qs }: UrlInfo) {
    const pathname = `${basePath || ""}${path || ""}`;
    let search;
    if (qs) {
      if (typeof qs === "string") search = `?${qs}`;
      else search = `?${querystringify(clean(qs))}`;
    }
    return search ? { pathname, search } : { pathname };
  }

  addToHostList(urls: string | string[]): number[] {
    const cleanUrls = (Array.isArray(urls) ? urls : [urls]).map(url =>
      sanitizeUrl(url)
    );
    const newUrls = cleanUrls.filter(url => this._urls.indexOf(url) === -1);
    this._urls.push(...newUrls);
    this._hosts.push(
      ...newUrls.map((url: string) =>
        createRequest(url, this._agentOptions, this._agent)
      )
    );
    return cleanUrls.map(url => this._urls.indexOf(url));
  }

  setTransactionId(transactionId: string) {
    this._transactionId = transactionId;
  }

  clearTransactionId() {
    this._transactionId = null;
  }

  setHeader(key: string, value: string) {
    this._headers[key] = value;
  }

  close() {
    for (const host of this._hosts) {
      if (host.close) host.close();
    }
  }

  request<T = ArangojsResponse>(
    {
      host,
      method = "GET",
      body,
      expectBinary = false,
      isBinary = false,
      allowDirtyRead = false,
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

      const extraHeaders: { [key: string]: string } = {
        ...this._headers,
        "content-type": contentType,
        "x-arango-version": String(this._arangoVersion)
      };

      if (this._transactionId) {
        extraHeaders["x-arango-trx-id"] = this._transactionId;
      }

      this._queue.push({
        retries: 0,
        host,
        allowDirtyRead,
        options: {
          url: this._buildUrl(urlInfo),
          headers: { ...extraHeaders, ...headers },
          timeout,
          method,
          expectBinary,
          body
        },
        reject,
        resolve: (res: ArangojsResponse) => {
          const contentType = res.headers["content-type"];
          let parsedBody: any = undefined;
          if (res.body.length && contentType && contentType.match(MIME_JSON)) {
            try {
              parsedBody = res.body;
              parsedBody = JSON.parse(parsedBody);
            } catch (e) {
              if (!expectBinary) {
                if (typeof parsedBody !== "string") {
                  parsedBody = res.body.toString("utf-8");
                }
                e.response = res;
                reject(e);
                return;
              }
            }
          } else if (res.body && !expectBinary) {
            parsedBody = res.body.toString("utf-8");
          } else {
            parsedBody = res.body;
          }
          if (
            parsedBody &&
            parsedBody.hasOwnProperty("error") &&
            parsedBody.hasOwnProperty("code") &&
            parsedBody.hasOwnProperty("errorMessage") &&
            parsedBody.hasOwnProperty("errorNum")
          ) {
            res.body = parsedBody;
            reject(new ArangoError(res));
          } else if (res.statusCode && res.statusCode >= 400) {
            res.body = parsedBody;
            reject(new HttpError(res));
          } else {
            if (!expectBinary) res.body = parsedBody;
            resolve(transform ? transform(res) : (res as any));
          }
        }
      });
      this._runQueue();
    });
  }
}
