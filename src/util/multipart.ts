import { Errback } from "./types";
import Multipart from "multi-part";
import { Readable } from "stream";

export type Fields = {
  [key: string]: any;
};

export type MultipartRequest = {
  headers?: { [key: string]: string };
  body: Buffer | FormData;
};

export function toForm(fields: Fields, callback: Errback<MultipartRequest>) {
  let called = false;
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
    const stream = form.getStream();
    const bufs: Buffer[] = [];
    stream.on("data", buf => bufs.push(buf as Buffer));
    stream.on("end", () => {
      if (called) return;
      bufs.push(Buffer.from("\r\n"));
      const body = Buffer.concat(bufs);
      const boundary = form.getBoundary();
      const headers = {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(body.length)
      };
      called = true;
      callback(null, { body, headers });
    });
    stream.on("error", e => {
      if (called) return;
      called = true;
      callback(e);
    });
  } catch (e) {
    if (called) return;
    called = true;
    callback(e);
  }
}
