import { ArangojsResponse } from "./util/request";
import { Connection } from "./connection";

export class Route {
  private _connection: Connection;
  private _path: string;
  private _headers: Object;

  constructor(connection: Connection, path: string = "", headers: Object = {}) {
    if (!path) path = "";
    else if (path.charAt(0) !== "/") path = `/${path}`;
    this._connection = connection;
    this._path = path;
    this._headers = headers;
  }

  route(path: string, headers?: Object) {
    if (!path) path = "";
    else if (path.charAt(0) !== "/") path = `/${path}`;
    return new Route(this._connection, this._path + path, {
      ...this._headers,
      ...headers
    });
  }

  request({ method, path, headers = {}, ...opts }: any) {
    if (!path) opts.path = "";
    else if (this._path && path.charAt(0) !== "/") opts.spath = `/${path}`;
    else opts.path = path;
    opts.basePath = this._path;
    opts.headers = { ...this._headers, ...headers };
    opts.method = method ? method.toUpperCase() : "GET";
    return new Promise<ArangojsResponse>((resolve, reject) =>
      this._connection.request(opts, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      })
    );
  }

  private _request1(method: string, ...args: any[]) {
    let path: string = "";
    let qs: Object | undefined;
    let headers: Object | undefined;
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
    let qs: Object | undefined;
    let headers: Object | undefined;
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
  delete(path?: string, qs?: Object): Promise<ArangojsResponse>;
  delete(qs?: Object): Promise<ArangojsResponse>;
  delete(qs?: Object, headers?: Object): Promise<ArangojsResponse>;
  delete(
    path?: string,
    qs?: Object,
    headers?: Object
  ): Promise<ArangojsResponse>;
  delete(...args: any[]): Promise<ArangojsResponse> {
    return this._request1("DELETE", ...args);
  }

  get(): Promise<ArangojsResponse>;
  get(path?: string): Promise<ArangojsResponse>;
  get(path?: string, qs?: Object): Promise<ArangojsResponse>;
  get(path?: string, qs?: Object, headers?: Object): Promise<ArangojsResponse>;
  get(qs?: Object): Promise<ArangojsResponse>;
  get(qs?: Object, headers?: Object): Promise<ArangojsResponse>;
  get(...args: any[]): Promise<ArangojsResponse> {
    return this._request1("GET", ...args);
  }

  head(): Promise<ArangojsResponse>;
  head(path?: string): Promise<ArangojsResponse>;
  head(path?: string, qs?: Object): Promise<ArangojsResponse>;
  head(path?: string, qs?: Object, headers?: Object): Promise<ArangojsResponse>;
  head(qs?: Object): Promise<ArangojsResponse>;
  head(qs?: Object, headers?: Object): Promise<ArangojsResponse>;
  head(...args: any[]): Promise<ArangojsResponse> {
    return this._request1("HEAD", ...args);
  }

  patch(): Promise<ArangojsResponse>;
  patch(path?: string): Promise<ArangojsResponse>;
  patch(path?: string, body?: any): Promise<ArangojsResponse>;
  patch(path?: string, body?: any, qs?: Object): Promise<ArangojsResponse>;
  patch(body?: any): Promise<ArangojsResponse>;
  patch(body?: any, qs?: Object): Promise<ArangojsResponse>;
  patch(body?: any, qs?: Object, headers?: Object): Promise<ArangojsResponse>;
  patch(
    path?: string,
    body?: any,
    qs?: Object,
    headers?: Object
  ): Promise<ArangojsResponse>;
  patch(...args: any[]): Promise<ArangojsResponse> {
    return this._request2("PATCH", ...args);
  }

  post(): Promise<ArangojsResponse>;
  post(path?: string): Promise<ArangojsResponse>;
  post(path?: string, body?: any): Promise<ArangojsResponse>;
  post(path?: string, body?: any, qs?: Object): Promise<ArangojsResponse>;
  post(body?: any): Promise<ArangojsResponse>;
  post(body?: any, qs?: Object): Promise<ArangojsResponse>;
  post(body?: any, qs?: Object, headers?: Object): Promise<ArangojsResponse>;
  post(
    path?: string,
    body?: any,
    qs?: Object,
    headers?: Object
  ): Promise<ArangojsResponse>;
  post(...args: any[]): Promise<ArangojsResponse> {
    return this._request2("POST", ...args);
  }

  put(): Promise<ArangojsResponse>;
  put(path?: string): Promise<ArangojsResponse>;
  put(path?: string, body?: any): Promise<ArangojsResponse>;
  put(path?: string, body?: any, qs?: Object): Promise<ArangojsResponse>;
  put(body?: any): Promise<ArangojsResponse>;
  put(body?: any, qs?: Object): Promise<ArangojsResponse>;
  put(body?: any, qs?: Object, headers?: Object): Promise<ArangojsResponse>;
  put(
    path?: string,
    body?: any,
    qs?: Object,
    headers?: Object
  ): Promise<ArangojsResponse>;
  put(...args: any[]): Promise<ArangojsResponse> {
    return this._request2("PUT", ...args);
  }
}
