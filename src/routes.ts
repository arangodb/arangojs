/**
 * ```ts
 * import type { Route } from "arangojs/routes";
 * ```
 *
 * The "routes" module provides route related types and interfaces for
 * TypeScript.
 *
 * @packageDocumentation
 */
import * as connections from "./connection.js";
import * as databases from "./databases.js";
import * as util from "./lib/util.js";

/**
 * Represents an arbitrary route relative to an ArangoDB database.
 */
export class Route {
  protected _db: databases.Database;
  protected _pathname: string;
  protected _headers: Headers;

  /**
   * @internal
   */
  constructor(
    db: databases.Database,
    pathname: string = "",
    headers: Headers | Record<string, string> = {},
  ) {
    if (!pathname) pathname = "";
    else if (pathname.charAt(0) !== "/") pathname = `/${pathname}`;
    this._db = db;
    this._pathname = pathname;
    this._headers = headers instanceof Headers ? headers : new Headers(headers);
  }

  /**
   * Database this route belongs to.
   */
  get database() {
    return this._db;
  }

  /**
   * Path of this route.
   */
  get pathname() {
    return this._pathname;
  }

  /**
   * Headers of this route.
   */
  get headers() {
    return this._headers;
  }

  /**
   * Creates a new route relative to this route that inherits any of its default
   * HTTP headers.
   *
   * @param pathname - Path relative to this route.
   * @param headers - Additional headers that will be sent with each request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const users = foxx.route("/users");
   * ```
   */
  route(pathname: string, headers?: Headers | Record<string, string>) {
    return new Route(
      this._db,
      util.joinPath(this._pathname, pathname),
      util.mergeHeaders(this._headers, headers),
    );
  }

  /**
   * Performs an arbitrary HTTP request relative to this route and returns the
   * server response.
   *
   * @param options - Options for performing the request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const res = await foxx.request({
   *   method: "POST",
   *   pathname: "/users",
   *   body: {
   *     username: "admin",
   *     password: "hunter2"
   *   }
   * });
   * ```
   */
  request(options: connections.RequestOptions = {}) {
    const { method = "GET", pathname, headers, ...opts } = options;
    return this._db.request(
      {
        ...opts,
        method: method.toUpperCase(),
        pathname: util.joinPath(this._pathname, pathname),
        headers: util.mergeHeaders(this._headers, headers),
      },
      false,
    );
  }

  /**
   * Performs a DELETE request against the given path relative to this route
   * and returns the server response.
   *
   * @param pathname - Path relative to this route.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const res = await foxx.delete("/users/admin");
   * ```
   */
  delete(
    pathname: string,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  /**
   * Performs a DELETE request against the given path relative to this route
   * and returns the server response.
   *
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const user = foxx.route("/users/admin");
   * const res = await user.delete();
   * ```
   */
  delete(
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  delete(...args: any[]): Promise<connections.ProcessedResponse> {
    const pathname = typeof args[0] === "string" ? args.shift() : undefined;
    const [search, headers] = args;
    return this.request({ method: "DELETE", pathname, search, headers });
  }

  /**
   * Performs a GET request against the given path relative to this route
   * and returns the server response.
   *
   * @param pathname - Path relative to this route.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const res = await foxx.get("/users", { offset: 10, limit: 5 });
   * ```
   */
  get(
    pathname: string,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  /**
   * Performs a GET request against the given path relative to this route
   * and returns the server response.
   *
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const users = foxx.route("/users");
   * const res = await users.get({ offset: 10, limit: 5 });
   * ```
   */
  get(
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  get(...args: any[]): Promise<connections.ProcessedResponse> {
    const pathname = typeof args[0] === "string" ? args.shift() : undefined;
    const [search, headers] = args;
    return this.request({ method: "GET", pathname, search, headers });
  }

  /**
   * Performs a HEAD request against the given path relative to this route
   * and returns the server response.
   *
   * @param pathname - Path relative to this route.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const res = await foxx.head("/users", { offset: 10, limit: 5 });
   * ```
   */
  head(
    pathname: string,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  /**
   * Performs a HEAD request against the given path relative to this route
   * and returns the server response.
   *
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const users = foxx.route("/users");
   * const res = await users.head({ offset: 10, limit: 5 });
   * ```
   */
  head(
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  head(...args: any[]): Promise<connections.ProcessedResponse> {
    const pathname = typeof args[0] === "string" ? args.shift() : undefined;
    const [search, headers] = args;
    return this.request({ method: "HEAD", pathname, search, headers });
  }

  /**
   * Performs a PATCH request against the given path relative to this route
   * and returns the server response.
   *
   * @param pathname - Path relative to this route.
   * @param body - Body of the request object.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const res = await foxx.patch("/users/admin", { password: "admin" });
   * ```
   */
  patch(
    pathname: string,
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  /**
   * Performs a PATCH request against the given path relative to this route
   * and returns the server response.
   *
   * **Note**: `body` must not be a `string`.
   *
   * @param body - Body of the request object. Must not be a string.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const user = foxx.route("/users/admin")
   * const res = await user.patch({ password: "admin" });
   * ```
   */
  patch(
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  patch(...args: any[]): Promise<connections.ProcessedResponse> {
    const pathname = typeof args[0] === "string" ? args.shift() : undefined;
    const [body, search, headers] = args;
    return this.request({ method: "PATCH", pathname, body, search, headers });
  }

  /**
   * Performs a POST request against the given path relative to this route
   * and returns the server response.
   *
   * @param pathname - Path relative to this route.
   * @param body - Body of the request object.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const res = await foxx.post("/users", {
   *   username: "admin",
   *   password: "hunter2"
   * });
   * ```
   */
  post(
    pathname: string,
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  /**
   * Performs a POST request against the given path relative to this route
   * and returns the server response.
   *
   * **Note**: `body` must not be a `string`.
   *
   * @param body - Body of the request object. Must not be a string.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const users = foxx.route("/users");
   * const res = await users.post({
   *   username: "admin",
   *   password: "hunter2"
   * });
   * ```
   */
  post(
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  post(...args: any[]): Promise<connections.ProcessedResponse> {
    const pathname = typeof args[0] === "string" ? args.shift() : undefined;
    const [body, search, headers] = args;
    return this.request({ method: "POST", pathname, body, search, headers });
  }

  /**
   * Performs a PUT request against the given path relative to this route
   * and returns the server response.
   *
   * @param pathname - Path relative to this route.
   * @param body - Body of the request object.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const res = await foxx.put("/users/admin/password", { password: "admin" });
   * ```
   */
  put(
    pathname: string,
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  /**
   * Performs a PUT request against the given path relative to this route
   * and returns the server response.
   *
   * **Note**: `body` must not be a `string`.
   *
   * @param body - Body of the request object. Must not be a string.
   * @param search - Query string parameters for this request.
   * @param headers - Additional headers to send with this request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const password = foxx.route("/users/admin/password");
   * const res = await password.put({ password: "admin" });
   * ```
   */
  put(
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>,
  ): Promise<connections.ProcessedResponse>;
  put(...args: any[]): Promise<connections.ProcessedResponse> {
    const pathname = typeof args[0] === "string" ? args.shift() : undefined;
    const [body, search, headers] = args;
    return this.request({ method: "PUT", pathname, body, search, headers });
  }
}
