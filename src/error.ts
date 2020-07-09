/**
 * ```ts
 * import type { ArangoError } from "arangojs/error";
 * ```
 *
 * The "error" module provides types and interfaces for TypeScript related
 * to arangojs error handling.
 *
 * @packageDocumentation
 */
import { ExtendableError } from "./lib/error";

const messages: { [key: number]: string } = {
  0: "Network Error",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "Request-URI Too Long",
  415: "Unsupported Media Type",
  416: "Requested Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  444: "Connection Closed Without Response",
  451: "Unavailable For Legal Reasons",
  499: "Client Closed Request",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
  599: "Network Connect Timeout Error",
};

const nativeErrorKeys = [
  "fileName",
  "lineNumber",
  "columnNumber",
  "stack",
  "description",
  "number",
] as (keyof Error)[];

/**
 * Indicates whether the given value represents an {@link ArangoError}.
 *
 * @param error - A value that might be an `ArangoError`.
 */
export function isArangoError(error: any): error is ArangoError {
  return Boolean(error && error.isArangoError);
}

/**
 * Indicates whether the given value represents an ArangoDB error response.
 *
 * @internal
 */
export function isArangoErrorResponse(body: any): boolean {
  return (
    body &&
    body.hasOwnProperty("error") &&
    body.hasOwnProperty("code") &&
    body.hasOwnProperty("errorMessage") &&
    body.hasOwnProperty("errorNum")
  );
}

/**
 * Indicates whether the given value represents a Node.js `SystemError`.
 */
export function isSystemError(err: any): err is SystemError {
  return (
    Object.getPrototypeOf(err) === Error.prototype &&
    err.hasOwnProperty("code") &&
    err.hasOwnProperty("errno") &&
    err.hasOwnProperty("syscall")
  );
}

/**
 * Interface representing a Node.js `SystemError`.
 */
export interface SystemError extends Error {
  code: string;
  errno: number | string;
  syscall: string;
}

/**
 * Represents an error returned by ArangoDB.
 */
export class ArangoError extends ExtendableError {
  name = "ArangoError";
  /**
   * ArangoDB error code.
   *
   * See {@link https://www.arangodb.com/docs/stable/appendix-error-codes.html | ArangoDB error documentation}.
   */
  errorNum: number;
  /**
   * HTTP status code included in the server error response object.
   */
  code: number;
  /**
   * Server response object.
   */
  response: any;

  /**
   * @internal
   * @hidden
   */
  constructor(response: any) {
    super();
    this.response = response;
    this.message = response.body.errorMessage;
    this.errorNum = response.body.errorNum;
    this.code = response.body.code;
    const err = new Error(this.message);
    err.name = this.name;
    for (const key of nativeErrorKeys) {
      if (err[key]) this[key] = err[key]!;
    }
  }

  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB error.
   */
  get isArangoError(): true {
    return true;
  }
}

/**
 * Represents a plain HTTP error response.
 */
export class HttpError extends ExtendableError {
  name = "HttpError";
  /**
   * Server response object.
   */
  response: any;
  /**
   * HTTP status code of the server response.
   */
  code: number;

  /**
   * @internal
   * @hidden
   */
  constructor(response: any) {
    super();
    this.response = response;
    this.code = response.statusCode || 500;
    this.message = messages[this.code] || messages[500];
    const err = new Error(this.message);
    err.name = this.name;
    for (const key of nativeErrorKeys) {
      if (err[key]) this[key] = err[key]!;
    }
  }
}
