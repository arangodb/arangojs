declare module "xhr" {
  import { IncomingMessage, ClientRequest } from "http";
  export type Errback<T> = (err: Error | null, result?: T) => void;
  export type Response = IncomingMessage & { body?: string | Buffer };
  function xhr(options: any, cb: Errback<Response>): ClientRequest;
  export = xhr;
}
