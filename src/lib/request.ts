/**
 * Request handling internals.
 *
 * @packageDocumentation
 * @internal
 */

import { SystemError } from "../error";

/**
 * @internal
 */
function systemErrorToJSON(this: SystemError) {
  return {
    error: true,
    errno: this.errno,
    code: this.code,
    syscall: this.syscall,
  };
}

/**
 * @internal
 */
export interface ArangojsResponse extends globalThis.Response {
  request: globalThis.Request;
  parsedBody?: any;
  arangojsHostUrl?: string;
}

/**
 * @internal
 */
export interface ArangojsError extends Error {
  request: globalThis.Request;
  toJSON: () => Record<string, any>;
}

/**
 * @internal
 */
export type RequestOptions = {
  method: string;
  pathname: string;
  qs?: URLSearchParams;
  headers: Headers;
  body: any;
  expectBinary: boolean;
  timeout?: number;
};

/**
 * @internal
 */
export type RequestConfig = {
  credentials: "omit" | "include" | "same-origin";
  keepalive: boolean;
  beforeRequest?: (req: globalThis.Request) => void;
  afterResponse?: (err: ArangojsError | null, res?: ArangojsResponse) => void;
};

/**
 * @internal
 */
export type RequestFunction = {
  (options: RequestOptions): Promise<ArangojsResponse>;
  close?: () => void;
};

/**
 * @internal
 */
export const isBrowser = false;

/**
 * Create a function for performing requests against a given host.
 *
 * @param baseUrl - Base URL of the host, i.e. protocol, port and domain name.
 * @param config - Options to use for creating the agent.
 * @param agent - Agent to use for performing requests.
 *
 * @internal
 */
export function createRequest(
  baseUrl: URL,
  config: RequestConfig
): RequestFunction {
  let abort: AbortController | undefined;
  return Object.assign(
    async function request({
      method,
      qs: searchParams,
      pathname: requestPath,
      headers: requestHeaders,
      body,
      timeout,
    }: RequestOptions) {
      const headers = new Headers(requestHeaders);
      const url = new URL(
        baseUrl.search ? requestPath + baseUrl.search : requestPath,
        baseUrl
      );
      if (searchParams) {
        for (const [key, value] of searchParams) {
          url.searchParams.append(key, value);
        }
      }
      if (typeof body === "string" && !headers.has("content-length")) {
        body = new Blob([body]);
        headers.set("content-length", body.size.toString());
      }
      if (!headers.has("authorization")) {
        headers.set(
          "authorization",
          `Basic ${btoa(
            `${baseUrl.username || "root"}:${baseUrl.password || ""}`
          )}`
        );
      }
      const request = new Request(url, {
        method,
        headers,
        body,
        credentials: config.credentials,
        keepalive: config.keepalive,
      });
      if (config.beforeRequest) {
        config.beforeRequest(request);
      }
      abort = new AbortController();
      let t: ReturnType<typeof setTimeout> | undefined;
      if (timeout) {
        t = setTimeout(() => {
          abort?.abort();
        }, timeout);
      }
      try {
        const res = await fetch(request, { signal: abort.signal });
        if (t) clearTimeout(t);
        const response = res as ArangojsResponse;
        response.request = request;
        if (config.afterResponse) {
          config.afterResponse(null, response);
        }
        return response;
      } catch (err) {
        if (t) clearTimeout(t);
        const error = err as ArangojsError;
        error.request = request;
        error.toJSON = systemErrorToJSON;
        if (config.afterResponse) {
          config.afterResponse(error);
        }
        throw error;
      }
    },
    {
      close() {
        abort?.abort();
      },
    }
  );
}
