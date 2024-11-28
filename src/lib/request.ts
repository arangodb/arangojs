/**
 * Request handling internals.
 *
 * @packageDocumentation
 * @internal
 */

import { FetchFailedError, NetworkError, RequestAbortedError, ResponseTimeoutError } from "../errors.js";

function timer(timeout: number, cb: () => void) {
  const t = setTimeout(cb, timeout);
  return () => clearTimeout(t);
}

export const REASON_TIMEOUT = 'timeout';

/**
 * @internal
 */
export type RequestOptions = {
  method: string;
  pathname: string;
  search?: URLSearchParams;
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
  beforeRequest?: (req: globalThis.Request) => void | Promise<void>;
  afterResponse?: (err: NetworkError | null, res?: globalThis.Response & { request: globalThis.Request }) => void | Promise<void>;
};

/**
 * @internal
 */
export type RequestFunction = {
  (options: RequestOptions): Promise<globalThis.Response & { request: globalThis.Request }>;
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
  let abort: () => void | undefined;
  return Object.assign(
    async function request({
      method,
      search: searchParams,
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
      if (body instanceof FormData) {
        const res = new Response(body);
        const blob = await res.blob();
        // Workaround for ArangoDB 3.12.0-rc1 and earlier:
        // Omitting the final CRLF results in "bad request body" fatal error
        body = new Blob([blob, "\r\n"], { type: blob.type });
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
        const p = config.beforeRequest(request);
        if (p instanceof Promise) await p;
      }
      const abortController = new AbortController();
      const signal = abortController.signal;
      abort = () => abortController.abort();
      let clearTimer: (() => void) | undefined;
      if (timeout) {
        clearTimer = timer(timeout, () => {
          clearTimer = undefined;
          abortController.abort(REASON_TIMEOUT);
        });
      }
      let response: globalThis.Response & { request: globalThis.Request };
      try {
        response = Object.assign(await fetch(request, { signal }), { request });
      } catch (e: unknown) {
        const cause = e instanceof Error ? e : new Error(String(e));
        let error: NetworkError;
        if (signal.aborted) {
          const reason = typeof signal.reason == 'string' ? signal.reason : undefined;
          if (reason === REASON_TIMEOUT) {
            error = new ResponseTimeoutError(undefined, request, { cause });
          } else {
            error = new RequestAbortedError(reason, request, { cause });
          }
        } else if (cause instanceof TypeError) {
          error = new FetchFailedError(undefined, request, { cause });
        } else {
          error = new NetworkError(cause.message, request, { cause });
        }
        if (config.afterResponse) {
          const p = config.afterResponse(error);
          if (p instanceof Promise) await p;
        }
        throw error;
      } finally {
        clearTimer?.();
      }
      if (config.afterResponse) {
        const p = config.afterResponse(null, response);
        if (p instanceof Promise) await p;
      }
      return response;
    },
    {
      close() {
        abort?.();
      },
    }
  );
}
