declare module "multi-part" {
  import { Readable } from "stream";
  class Multipart {
    append(key: string, value: Readable | Buffer | string): void;
    getBoundary(): string;
    getStream(): Readable;
  }
  export = Multipart;
}
