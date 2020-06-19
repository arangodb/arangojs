/**
 * Node.js implementation of the HTTP(S) request function.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

import { format as formatUrl, parse as parseUrl } from "url";
import { Errback } from "../util/types";
import { btoa } from "./btoa";
import { joinPath } from "./joinPath";
import {
  ArangojsError,
  ArangojsResponse,
  RequestOptions,
} from "./request.node";
import xhr from "./xhr";

export const isBrowser = true;

function omit<T>(obj: T, keys: (keyof T)[]): T {
  const result = {} as T;
  for (const key of Object.keys(obj)) {
    if (keys.includes(key as keyof T)) continue;
    result[key as keyof T] = obj[key as keyof T];
  }
  return result;
}

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
export function createRequest(baseUrl: string, agentOptions: any) {
  const { auth, ...baseUrlParts } = parseUrl(baseUrl);
  const options = omit(agentOptions, ["maxSockets"]);
  return function request(
    { method, url, headers, body, timeout, expectBinary }: RequestOptions,
    cb: Errback<ArangojsResponse>
  ) {
    const urlParts = {
      ...baseUrlParts,
      pathname: url.pathname
        ? baseUrlParts.pathname
          ? joinPath(baseUrlParts.pathname, url.pathname)
          : url.pathname
        : baseUrlParts.pathname,
      search: url.search
        ? baseUrlParts.search
          ? `${baseUrlParts.search}&${url.search.slice(1)}`
          : url.search
        : baseUrlParts.search,
    };
    if (!headers["authorization"]) {
      headers["authorization"] = `Basic ${btoa(auth || "root:")}`;
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
        url: formatUrl(urlParts),
        body,
        method,
        headers,
        timeout,
      },
      (err: Error | null, res?: any) => {
        if (!err) {
          if (!res.body) res.body = "";
          callback(null, res as ArangojsResponse);
        } else {
          const error = err as ArangojsError;
          error.request = req;
          callback(error);
        }
      }
    );
  };
}
