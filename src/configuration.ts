/**
 * ```ts
 * import type { ConfigOptions } from "arangojs/configuration";
 * ```
 *
 * The "configuration" module provides configuration related types for
 * TypeScript.
 *
 * @packageDocumentation
 */
import * as connection from "./connection.js";

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
export function isBearerAuth(
  auth: BasicAuthCredentials | BearerAuthCredentials,
): auth is BearerAuthCredentials {
  return auth.hasOwnProperty("token");
}
//#endregion

//#region Config
/**
 * Options for configuring arangojs.
 */
export type ConfigOptions = connection.CommonRequestOptions & {
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
   * Default options to pass to the `fetch` function when making requests.
   *
   * See [the Fetch API specification](https://fetch.spec.whatwg.org/#request-class)
   * or the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
   * for more information on the available options.
   */
  fetchOptions?: connection.CommonFetchOptions;
  /**
   * If set, arangojs will use the [`undici`](https://www.npmjs.com/package/undici)
   * package to make requests and the provided options will be used to create
   * the `undici` agent.
   *
   * See [the `undici` documentation](https://undici.nodejs.org/#/docs/api/Agent?id=parameter-agentoptions)
   * for more information on the available options.
   */
  agentOptions?: any;
  /**
   * Callback that will be invoked when a request
   *
   * @param err - Error encountered when handling this request.
   */
  onError?: (err: Error) => void | Promise<void>;
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
