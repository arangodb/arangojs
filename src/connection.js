import createRequest, { isBrowser } from "./util/request";

import ArangoError from "./error";
import Route from "./route";
import btoa from "./util/btoa";
import byteLength from "./util/bytelength";
import httperr from "http-errors";
import promisify from "./util/promisify";
import qs from "querystring";
import retry from "retry";

const MIME_JSON = /\/(json|javascript)(\W|$)/;

export default class Connection {
  constructor(config) {
    if (typeof config === "string") {
      config = { url: config };
    }
    this.config = { ...Connection.defaults, ...config };
    this.config.agentOptions = {
      ...Connection.agentDefaults,
      ...this.config.agentOptions
    };
    if (!this.config.headers) this.config.headers = {};
    if (!this.config.headers["x-arango-version"]) {
      this.config.headers["x-arango-version"] = this.config.arangoVersion;
    }
    this.arangoMajor = Math.floor(this.config.arangoVersion / 10000);
    const { request, auth, url } = createRequest(
      this.config.url,
      this.config.agentOptions,
      this.config.agent
    );
    this._baseUrl = url;
    this._request = request;
    if (auth && !this.config.headers["authorization"]) {
      this.config.headers["authorization"] = `Basic ${btoa(auth)}`;
    }
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
      opts.headers["content-length"] = body ? byteLength(body, "utf-8") : 0;
    }

    for (const key of Object.keys(this.config.headers)) {
      if (!opts.headers.hasOwnProperty(key)) {
        opts.headers[key] = this.config.headers[key];
      }
    }

    const url = this._buildUrl(opts);
    const doRequest = this._request;
    const operation = retry.operation(this.retryOptions);
    operation.attempt(function(currentAttempt) {
      doRequest(
        {
          url,
          headers: opts.headers,
          method: opts.method,
          expectBinary,
          body
        },
        (err, res) => {
          if (operation.retry(err)) return;
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
              if (
                currentAttempt === 1 &&
                err.errorNum === 21 &&
                operation.retry(err)
              )
                return;
              callback(err);
            } else if (res.statusCode >= 400) {
              err = httperr(res.statusCode);
              err.response = res;
              if (
                currentAttempt === 1 &&
                res.statusCode === 500 &&
                operation.retry(err)
              )
                return;
              callback(err);
            } else {
              if (expectBinary) res.body = rawBody;
              callback(null, res);
            }
          }
        }
      );
    });
    return promise;
  }
}

Connection.defaults = {
  url: "http://localhost:8529",
  databaseName: "_system",
  arangoVersion: 30000,
  retryConnection: false
};

Connection.agentDefaults = {
  maxSockets: 3,
  keepAlive: true,
  keepAliveMsecs: 1000
};
