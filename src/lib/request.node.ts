/**
 * TODO
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

import {
  Agent as HttpAgent,
  ClientRequest,
  ClientRequestArgs,
  IncomingMessage,
  request as httpRequest,
} from "http";
import { Agent as HttpsAgent, request as httpsRequest } from "https";
import { parse as parseUrl } from "url";
import { Headers } from "../connection";
import { Errback } from "../util/types";
import { btoa } from "./btoa";
import { joinPath } from "./joinPath";

export interface ArangojsResponse extends IncomingMessage {
  request: ClientRequest;
  body?: any;
  arangojsHostId?: number;
}

export interface ArangojsError extends Error {
  request: ClientRequest;
}

export type RequestOptions = {
  method: string;
  url: { pathname: string; search?: string };
  headers: Headers;
  body: any;
  expectBinary: boolean;
  timeout?: number;
};

export type RequestFunction = {
  (options: RequestOptions, cb: Errback<ArangojsResponse>): void;
  close?: () => void;
};

export const isBrowser = false;

export function createRequest(
  baseUrl: string,
  agentOptions: any,
  agent: any
): RequestFunction {
  const baseUrlParts = parseUrl(baseUrl);
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
    if (isTls) agent = new HttpsAgent(agentOptions);
    else agent = new HttpAgent(agentOptions);
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
              const result = res as ArangojsResponse;
              result.request = req;
              result.body = Buffer.concat(data);
              if (called) return;
              called = true;
              callback(null, result);
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
          callback(err);
        });
        if (body) req.write(body);
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
