/**
 * Node.js implementation of the HTTP(S) request function.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

import {
  Agent as HttpAgent,
  AgentOptions,
  ClientRequest,
  ClientRequestArgs,
  IncomingMessage,
  request as httpRequest,
} from "http";
import { Agent as HttpsAgent, request as httpsRequest } from "https";
import { parse as parseUrl, UrlWithStringQuery } from "url";
import { Headers, RequestInterceptors } from "../connection";
import { btoa } from "./btoa";
import { Errback } from "./errback";
import { joinPath } from "./joinPath";
import { omit } from "./omit";

/**
 * @internal
 * @hidden
 */
export interface ArangojsResponse extends IncomingMessage {
  request: ClientRequest;
  body?: any;
  arangojsHostId?: number;
}

/**
 * @internal
 * @hidden
 */
export interface ArangojsError extends Error {
  request: ClientRequest;
}

/**
 * @internal
 * @hidden
 */
export type RequestOptions = {
  method: string;
  url: { pathname: string; search?: string };
  headers: Headers;
  body: any;
  expectBinary: boolean;
  timeout?: number;
};

/**
 * @internal
 * @hidden
 */
export type RequestFunction = {
  (options: RequestOptions, cb: Errback<ArangojsResponse>): void;
  close?: () => void;
};

/**
 * @internal
 * @hidden
 */
export const isBrowser = false;

/**
 * Create a function for performing requests against a given host.
 *
 * @param baseUrl - Base URL of the host, i.e. protocol, port and domain name.
 * @param agentOptions - Options to use for creating the agent.
 * @param agent - Agent to use for performing requests.
 *
 * @internal
 * @hidden
 */
export function createRequest(
  baseUrl: string,
  agentOptions: AgentOptions & RequestInterceptors,
  agent?: any
): RequestFunction {
  const baseUrlParts = parseUrl(baseUrl) as Partial<UrlWithStringQuery>;
  if (!baseUrlParts.protocol) {
    throw new Error(`Invalid URL (no protocol): ${baseUrl}`);
  }
  const isTls = baseUrlParts.protocol === "https:";
  let socketPath: string | undefined;
  if (baseUrl.startsWith(`${baseUrlParts.protocol}//unix:`)) {
    if (!baseUrlParts.pathname) {
      throw new Error(
        `Unix socket URL must be in the format http://unix:/socket/path, http+unix:///socket/path or unix:///socket/path not ${baseUrl}`
      );
    }
    const i = baseUrlParts.pathname.indexOf(":");
    if (i === -1) {
      socketPath = baseUrlParts.pathname;
      delete baseUrlParts.pathname;
    } else {
      socketPath = baseUrlParts.pathname.slice(0, i);
      baseUrlParts.pathname = baseUrlParts.pathname.slice(i + 1);
      if (baseUrlParts.pathname === "") {
        delete baseUrlParts.pathname;
      }
    }
  }
  if (socketPath && !socketPath.replace(/\//g, "").length) {
    throw new Error(`Invalid URL (empty unix socket path): ${baseUrl}`);
  }
  if (!agent) {
    const opts = omit(agentOptions, ["before", "after"]);
    if (isTls) agent = new HttpsAgent(opts);
    else agent = new HttpAgent(opts);
  }
  return Object.assign(
    function request(
      { method, url, headers, body, timeout }: RequestOptions,
      callback: Errback<ArangojsResponse>
    ) {
      let path = baseUrlParts.pathname
        ? url.pathname
          ? joinPath(baseUrlParts.pathname, url.pathname)
          : baseUrlParts.pathname
        : url.pathname;
      const search = url.search
        ? baseUrlParts.search
          ? `${baseUrlParts.search}&${url.search.slice(1)}`
          : url.search
        : baseUrlParts.search;
      if (search) path += search;
      if (body && !headers["content-length"]) {
        headers["content-length"] = String(Buffer.byteLength(body));
      }
      if (!headers["authorization"]) {
        headers["authorization"] = `Basic ${btoa(
          baseUrlParts.auth || "root:"
        )}`;
      }
      const options: ClientRequestArgs = { path, method, headers, agent };
      if (socketPath) {
        options.socketPath = socketPath;
      } else {
        options.host = baseUrlParts.hostname;
        options.port = baseUrlParts.port;
      }
      let called = false;
      try {
        const req = (isTls ? httpsRequest : httpRequest)(
          options,
          (res: IncomingMessage) => {
            const data: Buffer[] = [];
            res.on("data", (chunk) => data.push(chunk as Buffer));
            res.on("end", () => {
              const response = res as ArangojsResponse;
              response.request = req;
              response.body = Buffer.concat(data);
              if (called) return;
              called = true;
              if (agentOptions.after) {
                agentOptions.after(null, response);
              }
              callback(null, response);
            });
          }
        );
        if (timeout) {
          req.setTimeout(timeout);
        }
        req.on("timeout", () => {
          req.abort();
        });
        req.on("error", (err) => {
          const error = err as ArangojsError;
          error.request = req;
          if (called) return;
          called = true;
          if (agentOptions.after) {
            agentOptions.after(error);
          }
          callback(error);
        });
        if (body) req.write(body);
        if (agentOptions.before) {
          agentOptions.before(req);
        }
        req.end();
      } catch (e) {
        if (called) return;
        called = true;
        setTimeout(() => {
          callback(e);
        }, 0);
      }
    },
    {
      close() {
        agent.destroy();
      },
    }
  );
}
