import { ArangoError, HttpError } from "./error";
import {
  ArangojsResponse,
  RequestFunction,
  createRequest,
  isBrowser
} from "./util/request";

import { Errback } from "./util/types";
import { Route } from "./route";
import { byteLength } from "./util/bytelength";
import { stringify as querystringify } from "querystring";

const MIME_JSON = /\/(json|javascript)(\W|$)/;

export type LoadBalancingStrategy = "NONE" | "ROUND_ROBIN" | "ONE_RANDOM";

type Task = {
  host?: string;
  resolve: Function;
  reject: Function;
  run: (
    request: RequestFunction,
    host: string | undefined,
    callback: Errback<any>
  ) => void;
};

export type Config =
  | string
  | string[]
  | Partial<{
      url: string | string[];
      databaseName: string | false;
      arangoVersion: number;
      loadBalancingStrategy: LoadBalancingStrategy;
      agent: Function;
      agentOptions: { [key: string]: any };
      headers: { [key: string]: string };
    }>;

export class Connection {
  private _activeTasks: number = 0;
  private _arangoVersion: number = 30000;
  private _databaseName: string | false = "_system";
  private _headers: { [key: string]: string };
  _loadBalancingStrategy: LoadBalancingStrategy;
  private _maxTasks: number;
  private _queue: Task[] = [];
  private _requests: RequestFunction[];
  private _url: string[] = ["http://localhost:8529"];

  constructor(config: Config = {}) {
    if (typeof config === "string") config = { url: config };
    else if (Array.isArray(config)) config = { url: config };

    if (config.arangoVersion !== undefined) {
      this._arangoVersion = config.arangoVersion;
    }
    if (config.databaseName !== undefined) {
      this._databaseName = config.databaseName;
    }
    this._headers = { ...config.headers };
    this._loadBalancingStrategy = config.loadBalancingStrategy || "NONE";
    if (config.url) {
      this._url = Array.isArray(config.url) ? config.url : [config.url];
    }
    const agentOptions = isBrowser
      ? { ...config.agentOptions! }
      : {
          maxSockets: 3,
          keepAlive: true,
          keepAliveMsecs: 1000,
          ...config.agentOptions
        };

    this._maxTasks = agentOptions.maxSockets || 3;
    if (agentOptions.keepAlive) this._maxTasks *= 2;

    const agent: Function | undefined = config.agent;
    this._requests = this._url.map((url: string) =>
      createRequest(url, agentOptions, agent)
    );
  }

  private get _databasePath() {
    return this._databaseName === false ? "" : `/_db/${this._databaseName}`;
  }

  private _drainQueue() {
    if (!this._queue.length || this._activeTasks >= this._maxTasks) return;
    const task = this._queue.shift()!;
    this._activeTasks += 1;
    task.run(this._requests[0], "whatever", (err, result) => {
      this._activeTasks -= 1;
      if (err) task.reject(err);
      else task.resolve(result);
      this._drainQueue();
    });
  }

  private _buildUrl(opts: any) {
    let pathname = "";
    let search;
    if (!opts.absolutePath) {
      pathname = this._databasePath;
      if (opts.basePath) pathname += opts.basePath;
    }
    if (opts.path) pathname += opts.path;
    if (opts.qs) {
      if (typeof opts.qs === "string") search = `?${opts.qs}`;
      else search = `?${querystringify(opts.qs)}`;
    }
    return search ? { pathname, search } : { pathname };
  }

  get arangoMajor() {
    return Math.floor(this._arangoVersion / 10000);
  }

  getDatabaseName() {
    return this._databaseName;
  }

  setDatabaseName(databaseName: string) {
    if (this._databaseName === false) {
      throw new Error("Can not change database from absolute URL");
    }
    this._databaseName = databaseName;
  }

  setHeader(key: string, value: string) {
    this._headers[key] = value;
  }

  route(path?: string, headers?: Object) {
    return new Route(this, path, headers);
  }

  request(opts: any) {
    const expectBinary = opts.expectBinary || false;
    let contentType = "text/plain";
    let body = opts.body;

    if (body) {
      if (typeof body === "object") {
        if (opts.ld) {
          body =
            body.map((obj: any) => JSON.stringify(obj)).join("\r\n") + "\r\n";
          contentType = "application/x-ldjson";
        } else {
          body = JSON.stringify(body);
          contentType = "application/json";
        }
      } else {
        body = String(body);
      }
    } else {
      body = opts.rawBody;
    }

    if (!opts.headers.hasOwnProperty("content-type")) {
      opts.headers["content-type"] = contentType;
    }

    if (!isBrowser && !opts.headers.hasOwnProperty("content-length")) {
      // Can't override content-length in browser but ArangoDB needs it to be set
      opts.headers["content-length"] = String(
        body ? byteLength(body, "utf-8") : 0
      );
    }

    if (!opts.headers.hasOwnProperty("x-arango-version")) {
      opts.headers["x-arango-version"] = String(this._arangoVersion);
    }

    for (const key of Object.keys(this._headers)) {
      if (!opts.headers.hasOwnProperty(key)) {
        opts.headers[key] = this._headers[key];
      }
    }

    const url = this._buildUrl(opts);
    return new Promise<ArangojsResponse>((resolve, reject) => {
      this._queue.push({
        resolve,
        reject,
        host: opts.host,
        run: (request, host, next) =>
          request(
            {
              url,
              headers: opts.headers,
              method: opts.method,
              expectBinary,
              body
            },
            (err, res): void => {
              if (err) {
                next(err);
              } else {
                const response = res!;
                response.host = host;
                const contentType = response.headers["content-type"];
                let parsedBody: any = {};
                if (contentType && contentType.match(MIME_JSON)) {
                  try {
                    if (!response.body) {
                      parsedBody = "";
                    }
                    if (expectBinary) {
                      parsedBody = (response.body as Buffer).toString("utf-8");
                    } else {
                      parsedBody = response.body as string;
                    }
                    parsedBody = JSON.parse(parsedBody);
                  } catch (e) {
                    if (!expectBinary) {
                      e.response = response;
                      next(e);
                      return;
                    }
                  }
                }
                if (
                  parsedBody &&
                  parsedBody.hasOwnProperty("error") &&
                  parsedBody.hasOwnProperty("code") &&
                  parsedBody.hasOwnProperty("errorMessage") &&
                  parsedBody.hasOwnProperty("errorNum")
                ) {
                  response.body = parsedBody;
                  next(new ArangoError(response));
                } else if (response.statusCode && response.statusCode >= 400) {
                  response.body = parsedBody;
                  next(new HttpError(response));
                } else {
                  if (!expectBinary) response.body = parsedBody;
                  next(null, response);
                }
              }
            }
          )
      });
      this._drainQueue();
    });
  }
}
