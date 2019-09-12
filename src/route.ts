import { Connection } from "./connection";
import { ArangojsResponse } from "./util/request";

export type Headers = { [key: string]: string };

export type Params = { [key: string]: string | number | boolean };

export class Route {
  private _connection: Connection;
  private _path: string;
  private _headers: Headers;

  constructor(
    connection: Connection,
    path: string = "",
    headers: Headers = {}
  ) {
    if (!path) path = "";
    else if (path.charAt(0) !== "/") path = `/${path}`;
    this._connection = connection;
    this._path = path;
    this._headers = headers;
  }

  route(path: string, headers?: Headers) {
    if (!path) path = "";
    else if (path.charAt(0) !== "/") path = `/${path}`;
    return new Route(this._connection, this._path + path, {
      ...this._headers,
      ...headers
    });
  }

  request({ method, path, headers = {}, ...opts }: any) {
    if (!path) opts.path = "";
    else if (this._path && path.charAt(0) !== "/") opts.path = `/${path}`;
    else opts.path = path;
    opts.basePath = this._path;
    opts.headers = { ...this._headers, ...headers };
    opts.method = method ? method.toUpperCase() : "GET";
    return this._connection.request(opts);
  }

  private _request1(method: string, ...args: any[]) {
    let path: string = "";
    let qs: Params | undefined;
    let headers: Headers | undefined;
    if (args[0] === undefined || typeof args[0] === "string") {
      path = args.shift();
    }
    if (args[0] === undefined || typeof args[0] === "object") {
      qs = args.shift();
    }
    if (args[0] === undefined || typeof args[0] === "object") {
      headers = args.shift();
    }
    return this.request({ method, path, qs, headers });
  }

  private _request2(method: string, ...args: any[]) {
    let path: string = "";
    let body: any = undefined;
    let qs: Params | undefined;
    let headers: Headers | undefined;
    if (args[0] === undefined || typeof args[0] === "string") {
      path = args.shift();
    }
    body = args.shift();
    if (args[0] === undefined || typeof args[0] === "object") {
      qs = args.shift();
    }
    if (args[0] === undefined || typeof args[0] === "object") {
      headers = args.shift();
    }
    return this.request({ method, path, body, qs, headers });
  }

  delete(): Promise<ArangojsResponse>;
  delete(path?: string): Promise<ArangojsResponse>;
  delete(path?: string, qs?: Params): Promise<ArangojsResponse>;
  delete(qs?: Params): Promise<ArangojsResponse>;
  delete(qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
  delete(
    path?: string,
    qs?: Params,
    headers?: Headers
  ): Promise<ArangojsResponse>;
  delete(...args: any[]): Promise<ArangojsResponse> {
    return this._request1("DELETE", ...args);
  }

  get(): Promise<ArangojsResponse>;
  get(path?: string): Promise<ArangojsResponse>;
  get(path?: string, qs?: Params): Promise<ArangojsResponse>;
  get(path?: string, qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
  get(qs?: Params): Promise<ArangojsResponse>;
  get(qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
  get(...args: any[]): Promise<ArangojsResponse> {
    return this._request1("GET", ...args);
  }

  head(): Promise<ArangojsResponse>;
  head(path?: string): Promise<ArangojsResponse>;
  head(path?: string, qs?: Params): Promise<ArangojsResponse>;
  head(
    path?: string,
    qs?: Params,
    headers?: Headers
  ): Promise<ArangojsResponse>;
  head(qs?: Params): Promise<ArangojsResponse>;
  head(qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
  head(...args: any[]): Promise<ArangojsResponse> {
    return this._request1("HEAD", ...args);
  }

  patch(): Promise<ArangojsResponse>;
  patch(path?: string): Promise<ArangojsResponse>;
  patch(path?: string, body?: any): Promise<ArangojsResponse>;
  patch(path?: string, body?: any, qs?: Params): Promise<ArangojsResponse>;
  patch(body?: any): Promise<ArangojsResponse>;
  patch(body?: any, qs?: Params): Promise<ArangojsResponse>;
  patch(body?: any, qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
  patch(
    path?: string,
    body?: any,
    qs?: Params,
    headers?: Headers
  ): Promise<ArangojsResponse>;
  patch(...args: any[]): Promise<ArangojsResponse> {
    return this._request2("PATCH", ...args);
  }

  post(): Promise<ArangojsResponse>;
  post(path?: string): Promise<ArangojsResponse>;
  post(path?: string, body?: any): Promise<ArangojsResponse>;
  post(path?: string, body?: any, qs?: Params): Promise<ArangojsResponse>;
  post(body?: any): Promise<ArangojsResponse>;
  post(body?: any, qs?: Params): Promise<ArangojsResponse>;
  post(body?: any, qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
  post(
    path?: string,
    body?: any,
    qs?: Params,
    headers?: Headers
  ): Promise<ArangojsResponse>;
  post(...args: any[]): Promise<ArangojsResponse> {
    return this._request2("POST", ...args);
  }

  put(): Promise<ArangojsResponse>;
  put(path?: string): Promise<ArangojsResponse>;
  put(path?: string, body?: any): Promise<ArangojsResponse>;
  put(path?: string, body?: any, qs?: Params): Promise<ArangojsResponse>;
  put(body?: any): Promise<ArangojsResponse>;
  put(body?: any, qs?: Params): Promise<ArangojsResponse>;
  put(body?: any, qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
  put(
    path?: string,
    body?: any,
    qs?: Params,
    headers?: Headers
  ): Promise<ArangojsResponse>;
  put(...args: any[]): Promise<ArangojsResponse> {
    return this._request2("PUT", ...args);
  }
}
