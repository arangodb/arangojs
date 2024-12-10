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
 * Indicates whether the given value represents a Node.js `SystemError`.
 */
export function isSystemError(err: any): err is SystemError {
  if (!err || !(err instanceof Error)) return false;
  if (Object.getPrototypeOf(err) !== Error.prototype) return false;
  const error = err as SystemError;
  if (typeof error.code !== 'string') return false;
  if (typeof error.syscall !== 'string') return false;
  return typeof error.errno === 'number' || typeof error.errno === 'string';
}

/**
 * @internal
 *
 * Indicates whether the given value represents a Node.js `UndiciError`.
 */
export function isUndiciError(err: any): err is UndiciError {
  if (!err || !(err instanceof Error)) return false;
  const error = err as UndiciError;
  if (typeof error.code !== 'string') return false;
  return error.code.startsWith('UND_');
}

/**
 * @internal
 *
 * Determines whether the given failed fetch error cause is safe to retry.
 */
function isSafeToRetryFailedFetch(error?: Error): boolean | null {
  if (!error || !error.cause) return null;
  let cause = error.cause as Error;
  if (isArangoError(cause) || isNetworkError(cause)) {
    return cause.isSafeToRetry;
  }
  if (isSystemError(cause) && cause.syscall === 'connect' && cause.code === 'ECONNREFUSED') {
    return true;
  }
  if (isUndiciError(cause) && cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
    return true;
  }
  return isSafeToRetryFailedFetch(cause);
}

/**
 * Interface representing a Node.js `UndiciError`.
 *
 * @internal
 */
export interface UndiciError extends Error {
  code: `UND_${string}`;
}

/**
 * Interface representing a Node.js `SystemError`.
 *
 * @internal
 */
export interface SystemError extends Error {
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

  constructor(message: string | undefined, request: globalThis.Request, options: { cause?: Error, isSafeToRetry?: boolean | null } = {}) {
    let isSafeToRetry = options.isSafeToRetry ?? isSafeToRetryFailedFetch(options.cause);
    if (options.cause?.cause instanceof Error && options.cause.cause.message) {
      message = `Fetch failed: ${options.cause.cause.message}`;
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
    super(connection.getStatusMessage(response), response.request, options);
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

  toString() {
    return `${this.name} ${this.code}: ${this.message}`;
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
  code?: number;

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
  constructor(
    data: Omit<connection.ArangoErrorResponse, "error">,
    options: { cause?: Error; isSafeToRetry?: boolean | null } = {},
  ) {
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