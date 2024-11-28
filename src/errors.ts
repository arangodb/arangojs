/**
 * ```ts
 * import type { ArangoError, HttpError } from "arangojs/errors";
 * ```
 *
 * The "errors" module provides types and interfaces for TypeScript related
 * to arangojs error handling.
 *
 * @packageDocumentation
 */

import * as connection from "./connection.js";
import { ERROR_ARANGO_MAINTENANCE_MODE } from "./lib/codes.js";

const messages: { [key: number]: string } = {
  0: "Network Error",
  304: "Not Modified",
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

/**
 * Indicates whether the given value represents an {@link ArangoError}.
 *
 * @param error - A value that might be an `ArangoError`.
 */
export function isArangoError(error: any): error is ArangoError {
  return Boolean(error && error.isArangoError);
}

/**
 * Indicates whether the given value represents a {@link NetworkError}.
 *
 * @param error - A value that might be a `NetworkError`.
 */
export function isNetworkError(error: any): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * @internal
*
 * Indicates whether the given value represents an ArangoDB error response.
 */
export function isArangoErrorResponse(body: any): body is connection.ArangoErrorResponse {
  return (
    body &&
    body.error === true &&
    typeof body.code === 'number' &&
    typeof body.errorMessage === 'string' &&
    typeof body.errorNum === 'number'
  );
}

/**
 * @internal
 * 
 * Indicates whether the given value represents a Node.js `SystemError`.
 */
function isSystemError(err: any): err is SystemError {
  return (
    err &&
    Object.getPrototypeOf(err) === Error.prototype &&
    typeof err.code === 'string' &&
    typeof err.errno !== 'undefined' &&
    typeof err.syscall === 'string'
  );
}

/**
 * @internal
 * 
 * Indicates whether the given value represents a Node.js `UndiciError`.
 */
function isUndiciError(err: any): err is UndiciError {
  return (
    err &&
    err instanceof Error &&
    typeof (err as UndiciError).code === 'string' &&
    (err as UndiciError).code.startsWith('UND_')
  );
}

/**
 * @internal
 *
 * Determines whether the given failed fetch error cause is safe to retry.
 */
function isSafeToRetryFailedFetch(cause: Error): boolean | null {
  if (isSystemError(cause) && cause.syscall === 'connect' && cause.code === 'ECONNREFUSED') {
    return true;
  }
  if (isUndiciError(cause) && cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
    return true;
  }
  return null;
}

/**
 * Interface representing a Node.js `UndiciError`.
 * 
 * @internal
 */
interface UndiciError extends Error {
  code: `UND_${string}`;
}

/**
 * Interface representing a Node.js `SystemError`.
 * 
 * @internal
 */
interface SystemError extends Error {
  code: string;
  errno: number | string;
  syscall: string;
}

/**
 * Represents an error from a deliberate timeout encountered while waiting
 * for propagation.
 */
export class PropagationTimeoutError extends Error {
  name = "PropagationTimeoutError";

  constructor(message?: string, options: { cause?: Error } = {}) {
    super(message ?? 'Timed out while waiting for propagation', options);
  }
}

/**
 * Represents a network error or an error encountered while performing a network request.
 */
export class NetworkError extends Error {
  name = "NetworkError";

  /**
   * Indicates whether the request that caused this error can be safely retried.
   */
  isSafeToRetry: boolean | null;

  /**
   * Fetch request object.
   */
  request: globalThis.Request;

  constructor(message: string, request: globalThis.Request, options: { cause?: Error, isSafeToRetry?: boolean | null } = {}) {
    const { isSafeToRetry = null, ...opts } = options;
    super(message, opts);
    this.request = request;
    this.isSafeToRetry = isSafeToRetry;
  }

  toJSON() {
    return {
      error: true,
      errorMessage: this.message,
      code: 0,
    };
  }
}

/**
 * Represents an error from a deliberate timeout encountered while waiting
 * for a server response.
 */
export class ResponseTimeoutError extends NetworkError {
  name = "ResponseTimeoutError";

  constructor(message: string | undefined, request: globalThis.Request, options: { cause?: Error, isSafeToRetry?: boolean | null } = {}) {
    super(message ?? 'Timed out while waiting for server response', request, options);
  }
}

/**
 * Represents an error from a request that was aborted.
 */
export class RequestAbortedError extends NetworkError {
  name = "RequestAbortedError";

  constructor(message: string | undefined, request: globalThis.Request, options: { cause?: Error, isSafeToRetry?: boolean | null } = {}) {
    super(message ?? 'Request aborted', request, options);
  }
}

/**
 * Represents an error from a failed fetch request.
 * 
 * The root cause is often extremely difficult to determine.
 */
export class FetchFailedError extends NetworkError {
  name = "FetchFailedError";

  constructor(message: string | undefined, request: globalThis.Request, options: { cause?: TypeError, isSafeToRetry?: boolean | null } = {}) {
    let isSafeToRetry = options.isSafeToRetry;
    if (options.cause?.cause instanceof Error) {
      if (isSafeToRetry === undefined) {
        isSafeToRetry = isSafeToRetryFailedFetch(options.cause.cause) || undefined;
      }
      if (message === undefined) {
        message = `Fetch failed: ${options.cause.cause.message}`;
      }
    }
    super(message ?? 'Fetch failed', request, { ...options, isSafeToRetry });
  }
}

/**
 * Represents a plain HTTP error response.
 */
export class HttpError extends NetworkError {
  name = "HttpError";

  /**
   * HTTP status code of the server response.
   */
  code: number;

  /**
   * Server response object.
   */
  response: connection.ProcessedResponse;

  /**
   * @internal
   */
  constructor(response: connection.ProcessedResponse, options: { cause?: Error, isSafeToRetry?: boolean | null } = {}) {
    const message = messages[response.status] ?? messages[500];
    super(message, response.request, options);
    this.response = response;
    this.code = response.status;
  }

  toJSON() {
    return {
      error: true,
      errorMessage: this.message,
      code: this.code,
    };
  }
}

/**
 * Represents an error returned by ArangoDB.
 */
export class ArangoError extends Error {
  name = "ArangoError";

  /**
   * Indicates whether the request that caused this error can be safely retried.
   * 
   * @internal
   */
  isSafeToRetry: boolean | null = null;

  /**
   * @internal
   */
  get error(): true {
    return true;
  }

  /**
   * ArangoDB error code.
   *
   * See [ArangoDB error documentation](https://www.arangodb.com/docs/stable/appendix-error-codes.html).
   */
  errorNum: number;

  /**
   * Error message accompanying the error code.
   */
  get errorMessage(): string {
    return this.message;
  }

  /**
   * HTTP status code included in the server error response object.
   */
  code: number;

  /**
   * @internal
   *
   * Creates a new `ArangoError` from a response object.
   */
  static from(response: connection.ProcessedResponse<connection.ArangoErrorResponse>): ArangoError {
    return new ArangoError(response.parsedBody!, {
      cause: new HttpError(response)
    });
  }

  /**
   * Creates a new `ArangoError` from an ArangoDB error response.
   */
  constructor(data: connection.ArangoErrorResponse, options: { cause?: Error, isSafeToRetry?: boolean | null } = {}) {
    const { isSafeToRetry, ...opts } = options;
    super(data.errorMessage, opts);
    this.errorNum = data.errorNum;
    this.code = data.code;
    if (isSafeToRetry !== undefined) {
      this.isSafeToRetry = isSafeToRetry;
    } else if (this.errorNum === ERROR_ARANGO_MAINTENANCE_MODE) {
      this.isSafeToRetry = true;
    } else if (this.cause instanceof NetworkError) {
      this.isSafeToRetry = this.cause.isSafeToRetry;
    }
  }

  /**
   * Server response object.
   */
  get response(): connection.ProcessedResponse<connection.ArangoErrorResponse> | undefined {
    const cause = this.cause;
    if (cause instanceof HttpError) {
      return cause.response;
    }
    return undefined;
  }

  /**
   * Fetch request object.
   */
  get request(): globalThis.Request | undefined {
    const cause = this.cause;
    if (cause instanceof NetworkError) {
      return cause.request;
    }
    return undefined;
  }

  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB error.
   */
  get isArangoError(): true {
    return true;
  }

  toJSON(): connection.ArangoErrorResponse {
    return {
      error: true,
      errorMessage: this.errorMessage,
      errorNum: this.errorNum,
      code: this.code,
    };
  }

  toString() {
    return `${this.name} ${this.errorNum}: ${this.message}`;
  }
}