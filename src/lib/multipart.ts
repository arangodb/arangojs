/**
 * Utility function for constructing a multipart form in Node.js.
 *
 * @packageDocumentation
 * @internal
 */

import { Readable } from "stream";
import { Headers } from "../connection";

declare class MultiPart {
  append(
    field: string,
    value: any,
    options?: { filename?: string; contentType?: string }
  ): this;
  getHeaders(): Headers;
  buffer(): Promise<Buffer>;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Multipart = require("multi-part") as typeof MultiPart;

/**
 * @internal
 */
export type Fields = {
  [key: string]: any;
};

/**
 * @internal
 */
export interface MultipartRequest {
  headers?: Headers;
  body: Buffer;
}

/**
 * @internal
 */
export async function toForm(fields: Fields): Promise<MultipartRequest> {
  const form = new Multipart();
  for (const key of Object.keys(fields)) {
    let value = fields[key];
    if (value === undefined) continue;
    if (
      !(value instanceof Readable) &&
      !(value instanceof global.Buffer) &&
      (typeof value === "object" || typeof value === "function")
    ) {
      value = JSON.stringify(value);
    }
    form.append(key, value);
  }
  const body = await form.buffer();
  const headers = form.getHeaders();
  delete headers["transfer-encoding"];
  return { body, headers };
}
