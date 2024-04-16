/**
 * ```ts
 * import type { Route } from "arangojs/route.js";
 * ```
 *
 * The "route" module provides route related types and interfaces for TypeScript.
 *
 * @packageDocumentation
 */
import { RequestOptions } from "./connection.js";
import { Database } from "./database.js";
import { ArangojsResponse } from "./lib/request.js";
import { mergeHeaders } from "./lib/mergeHeaders.js";

/**
 * Represents an arbitrary route relative to an ArangoDB database.
 */
export class Route {
  protected _db: Database;
  protected _path: string;
  protected _headers: Headers;

  /**
   * @internal
   */
  constructor(
    db: Database,
    path: string = "",
    headers: Headers | Record<string, string> = {}
  ) {
    if (!path) path = "";
    else if (path.charAt(0) !== "/") path = `/${path}`;
    this._db = db;
    this._path = path;
    this._headers = headers instanceof Headers ? headers : new Headers(headers);
  }

  /**
   * Creates a new route relative to this route that inherits any of its default
   * HTTP headers.
   *
   * @param path - Path relative to this route.
   * @param headers - Additional headers that will be sent with each request.
   *
   * @example
   * ```js
   * const db = new Database();
   * const foxx = db.route("/my-foxx-service");
   * const users = foxx.route("/users");
   * ```
   */
  route(path: string, headers?: Headers | Record<string, string>) {
    if (!path) path = "";
    else if (path.charAt(0) !== "/") path = `/${path}`;
    return new Route(
      this._db,
      this._path + path,
      mergeHeaders(this._headers, headers)
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
   *   path: "/users",
   *   body: {
   *     username: "admin",
   *     password: "hunter2"
   *   }
   * });
   * ```
   */
  request(options?: RequestOptions) {
    const opts = { ...options };
    if (!opts.path || opts.path === "/") opts.path = "";
    else if (!this._path || opts.path.charAt(0) === "/") opts.path = opts.path;
    else opts.path = `/${opts.path}`;
    opts.basePath = this._path;
    opts.headers = mergeHeaders(this._headers, opts.headers);
    opts.method = opts.method ? opts.method.toUpperCase() : "GET";
    return this._db.request(opts, false);
  }

  /**
   * Performs a DELETE request against the given path relative to this route
   * and returns the server response.
   *
   * @param path - Path relative to this route.
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
    path: string,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
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
   * const user = foxx.roue("/users/admin");
   * const res = await user.delete();
   * ```
   */
  delete(
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
  delete(...args: any[]): Promise<ArangojsResponse> {
    const path = typeof args[0] === "string" ? args.shift() : undefined;
    const [search, headers] = args;
    return this.request({ method: "DELETE", path, search, headers });
  }

  /**
   * Performs a GET request against the given path relative to this route
   * and returns the server response.
   *
   * @param path - Path relative to this route.
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
    path: string,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
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
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
  get(...args: any[]): Promise<ArangojsResponse> {
    const path = typeof args[0] === "string" ? args.shift() : undefined;
    const [search, headers] = args;
    return this.request({ method: "GET", path, search, headers });
  }

  /**
   * Performs a HEAD request against the given path relative to this route
   * and returns the server response.
   *
   * @param path - Path relative to this route.
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
    path: string,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
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
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
  head(...args: any[]): Promise<ArangojsResponse> {
    const path = typeof args[0] === "string" ? args.shift() : undefined;
    const [search, headers] = args;
    return this.request({ method: "HEAD", path, search, headers });
  }

  /**
   * Performs a PATCH request against the given path relative to this route
   * and returns the server response.
   *
   * @param path - Path relative to this route.
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
    path: string,
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
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
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
  patch(...args: any[]): Promise<ArangojsResponse> {
    const path = typeof args[0] === "string" ? args.shift() : undefined;
    const [body, search, headers] = args;
    return this.request({ method: "PATCH", path, body, search, headers });
  }

  /**
   * Performs a POST request against the given path relative to this route
   * and returns the server response.
   *
   * @param path - Path relative to this route.
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
    path: string,
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
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
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
  post(...args: any[]): Promise<ArangojsResponse> {
    const path = typeof args[0] === "string" ? args.shift() : undefined;
    const [body, search, headers] = args;
    return this.request({ method: "POST", path, body, search, headers });
  }

  /**
   * Performs a PUT request against the given path relative to this route
   * and returns the server response.
   *
   * @param path - Path relative to this route.
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
    path: string,
    body?: any,
    search?: URLSearchParams | Record<string, any>,
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
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
    headers?: Headers | Record<string, string>
  ): Promise<ArangojsResponse>;
  put(...args: any[]): Promise<ArangojsResponse> {
    const path = typeof args[0] === "string" ? args.shift() : undefined;
    const [body, search, headers] = args;
    return this.request({ method: "PUT", path, body, search, headers });
  }
}
