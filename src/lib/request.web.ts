/// <reference lib="dom" />

/**
 * Node.js implementation of the HTTP(S) request function.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

import { RequestInterceptors, XhrOptions } from "../connection";
import { btoa } from "./btoa";
import { Errback } from "./errback";
import { omit } from "./omit";
import {
  ArangojsError,
  ArangojsResponse,
  RequestOptions,
} from "./request.node";
import xhr from "./xhr";

export const isBrowser = true;

/**
 * Create a function for performing requests against a given host.
 *
 * @param baseUrl - Base URL of the host, i.e. protocol, port and domain name.
 * @param agentOptions - Options to use for performing requests.
 *
 * @param baseUrl
 * @param agentOptions
 *
 * @internal
 * @hidden
 */
export function createRequest(
  baseUrl: string,
  agentOptions: XhrOptions & RequestInterceptors
) {
  const base = new URL(baseUrl);
  const auth = btoa(`${base.username || "root"}:${base.password}`);
  base.username = "";
  base.password = "";
  const options = omit(agentOptions, ["maxSockets"]);
  return function request(
    {
      method,
      url: reqUrl,
      headers,
      body,
      timeout,
      expectBinary,
    }: RequestOptions,
    cb: Errback<ArangojsResponse>
  ) {
    const url = new URL(reqUrl.pathname, base);
    if (base.search || reqUrl.search) {
      url.search = reqUrl.search
        ? `${base.search}&${reqUrl.search.slice(1)}`
        : base.search;
    }
    if (!headers["authorization"]) {
      headers["authorization"] = `Basic ${auth}`;
    }

    let callback: Errback<ArangojsResponse> = (err, res) => {
      callback = () => undefined;
      cb(err, res);
    };
    const req = xhr(
      {
        useXDR: true,
        withCredentials: true,
        ...options,
        responseType: expectBinary ? "blob" : "text",
        url: String(url),
        body,
        method,
        headers,
        timeout,
      },
      (err: Error | null, res?: any) => {
        if (!err) {
          const response = res as ArangojsResponse;
          response.request = req;
          if (!response.body) response.body = "";
          if (options.after) {
            options.after(null, response);
          }
          callback(null, response as ArangojsResponse);
        } else {
          const error = err as ArangojsError;
          error.request = req;
          if (options.after) {
            options.after(error);
          }
          callback(error);
        }
      }
    );
    if (options.before) {
      options.before(req);
    }
  };
}
