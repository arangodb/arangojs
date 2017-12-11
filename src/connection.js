import createRequest, { isBrowser } from "./util/request";

import ArangoError from "./error";
import LinkedList from "linkedlist";
import Route from "./route";
import byteLength from "./util/bytelength";
import httperr from "http-errors";
import promisify from "./util/promisify";
import qs from "querystring";

const MIME_JSON = /\/(json|javascript)(\W|$)/;

export default class Connection {
  constructor(config) {
    if (typeof config === "string") config = { url: config };
    else if (Array.isArray(config)) config = { url: config };
    this.config = { ...Connection.defaults, ...config };
    this.config.agentOptions = {
      ...Connection.agentDefaults,
      ...this.config.agentOptions
    };
    this.config.headers = {
      ["x-arango-version"]: this.config.arangoVersion,
      ...this.config.headers
    };
    this.arangoMajor = Math.floor(this.config.arangoVersion / 10000);
    this._queue = new LinkedList();
    this._activeTasks = 0;

    const request = createRequest(
      this.config.url,
      this.config.agentOptions,
      this.config.agent
    );
    this._request = request;
    if (this.config.databaseName === false) {
      this._databasePath = "";
    } else {
      this._databasePath = `/_db/${this.config.databaseName}`;
    }
    this.promisify = promisify(this.config.promise);
    this.retryOptions = {
      forever: this.config.retryConnection,
      retries: 0,
      minTimeout: 5000,
      randomize: true
    };
  }

  _drainQueue() {
    const maxConcurrent = this.config.agentOptions.keepAlive
      ? this.config.agentOptions.maxSockets * 2
      : this.config.agentOptions.maxSockets;
    if (!this._queue.length || this._activeTasks >= maxConcurrent) return;
    const task = this._queue.shift();
    this._activeTasks += 1;
    task(() => {
      this._activeTasks -= 1;
      this._drainQueue();
    });
  }

  _buildUrl(opts) {
    let pathname = "";
    let search;
    if (!opts.absolutePath) {
      pathname = this._databasePath;
      if (opts.basePath) pathname += opts.basePath;
    }
    if (opts.path) pathname += opts.path;
    if (opts.qs) {
      if (typeof opts.qs === "string") search = `?${opts.qs}`;
      else search = `?${qs.stringify(opts.qs)}`;
    }
    return search ? { pathname, search } : { pathname };
  }

  route(path, headers) {
    return new Route(this, path, headers);
  }

  request(opts, cb) {
    const { promise, callback } = this.promisify(cb);
    const expectBinary = opts.expectBinary || false;
    let contentType = "text/plain";
    let body = opts.body;

    if (body) {
      if (typeof body === "object") {
        if (opts.ld) {
          body = body.map(obj => JSON.stringify(obj)).join("\r\n") + "\r\n";
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

    for (const key of Object.keys(this.config.headers)) {
      if (!opts.headers.hasOwnProperty(key)) {
        opts.headers[key] = this.config.headers[key];
      }
    }

    const url = this._buildUrl(opts);
    this._queue.push(
      this._request(
        {
          url,
          headers: opts.headers,
          method: opts.method,
          expectBinary,
          body
        },
        (err, res) => {
          if (err) callback(err);
          else {
            const rawBody = res.body;
            if (res.headers["content-type"].match(MIME_JSON)) {
              try {
                if (expectBinary) res.body = res.body.toString("utf-8");
                res.body = res.body ? JSON.parse(res.body) : undefined;
              } catch (e) {
                res.body = rawBody;
                e.response = res;
                return callback(e);
              }
            }
            if (
              res.body &&
              res.body.error &&
              res.body.hasOwnProperty("code") &&
              res.body.hasOwnProperty("errorMessage") &&
              res.body.hasOwnProperty("errorNum")
            ) {
              err = new ArangoError(res.body);
              err.response = res;
              callback(err);
            } else if (res.statusCode >= 400) {
              err = httperr(res.statusCode);
              err.response = res;
              callback(err);
            } else {
              if (expectBinary) res.body = rawBody;
              callback(null, res);
            }
          }
        }
      )
    );
    this._drainQueue();
    return promise;
  }
}

Connection.defaults = {
  url: "http://localhost:8529",
  databaseName: "_system",
  arangoVersion: 30000,
  retryConnection: false
};

Connection.agentDefaults = isBrowser
  ? {
      maxSockets: 3,
      keepAlive: false
    }
  : {
      maxSockets: 3,
      keepAlive: true,
      keepAliveMsecs: 1000
    };
