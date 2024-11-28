/**
 * ```ts
 * import type { Config } from "arangojs/config";
 * ```
 *
 * The "config" module provides configuration related types for TypeScript.
 *
 * @packageDocumentation
 */
import * as errors from "./errors.js";

//#region Shared types
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
//#endregion

//#region Credentials
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

/**
 * Determines if the given credentials are for Bearer token authentication.
 */
export function isBearerAuth(auth: BasicAuthCredentials | BearerAuthCredentials): auth is BearerAuthCredentials {
  return auth.hasOwnProperty("token");
}
//#endregion

//#region Config
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
   * When working with a cluster, the method {@link databases.Database#acquireHostList}
   * can be used to automatically pick up additional coordinators/followers at
   * any point.
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
   * See also {@link databases.Database#useBasicAuth} and
   * {@link databases.Database#useBearerAuth}.
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
   * Default: `31100`
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
   * Maximum number of parallel requests arangojs will perform. If any
   * additional requests are attempted, they will be enqueued until one of the
   * active requests has completed.
   *
   * **Note:** when using `ROUND_ROBIN` load balancing and passing an array of
   * URLs in the `url` option, the default value of this option will be set to
   * `3 * url.length` instead of `3`.
   *
   * Default: `3`
   */
  poolSize?: number;
  /**
   * (Browser only.) Determines whether credentials (e.g. cookies) will be sent
   * with requests to the ArangoDB server.
   *
   * If set to `same-origin`, credentials will only be included with requests
   * on the same URL origin as the invoking script. If set to `include`,
   * credentials will always be sent. If set to `omit`, credentials will be
   * excluded from all requests.
   *
   * Default: `same-origin`
   */
  credentials?: "omit" | "include" | "same-origin";
  /**
   * If set to `true`, requests will keep the underlying connection open until
   * it times out or is closed. In browsers this prevents requests from being
   * cancelled when the user navigates away from the page.
   *
   * Default: `true`
   */
  keepalive?: boolean;
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
  afterResponse?: (err: errors.NetworkError | null, res?: globalThis.Response & { request: globalThis.Request; }) => void | Promise<void>;
  /**
   * Callback that will be invoked when a request
   *
   * @param err - Error encountered when handling this request.
   */
  onError?: (err: Error) => void | Promise<void>;
  /**
   * If set to a positive number, requests will automatically be retried at
   * most this many times if they result in a write-write conflict.
   *
   * Default: `0`
   */
  retryOnConflict?: number;
  /**
   * An object with additional headers to send with every request.
   *
   * If an `"authorization"` header is provided, it will be overridden when
   * using {@link databases.Database#useBasicAuth}, {@link databases.Database#useBearerAuth} or
   * the `auth` configuration option.
   */
  headers?: Headers | Record<string, string>;
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
   * will be stored and accessible using {@link databases.Database#queueTime}. If set to
   * a finite value, older values will be discarded to make room for new values
   * when that limit is reached.
   *
   * Default: `10`
   */
  responseQueueTimeSamples?: number;
};
//#endregion