import { Readable } from "stream";

declare class MultiPart {
  append(key: string, value: Readable | Buffer | string): void;
  getBoundary(): string;
  stream(): Readable;
}

const Multipart = require("multi-part") as typeof MultiPart;

/** @hidden */
export interface Fields {
  [key: string]: any;
}

/** @hidden */
export interface MultipartRequest {
  headers?: { [key: string]: string };
  body: Buffer;
}

/** @hidden */
export function toForm(fields: Fields): Promise<MultipartRequest> {
  return new Promise((resolve, reject) => {
    try {
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
      const stream = form.stream();
      const bufs: Buffer[] = [];
      stream.on("data", buf => bufs.push(buf as Buffer));
      stream.on("end", () => {
        bufs.push(Buffer.from("\r\n"));
        const body = Buffer.concat(bufs);
        const boundary = form.getBoundary();
        const headers = {
          "content-type": `multipart/form-data; boundary=${boundary}`,
          "content-length": String(body.length)
        };
        resolve({ body, headers });
      });
      stream.on("error", e => {
        reject(e);
      });
    } catch (e) {
      reject(e);
    }
  });
}
