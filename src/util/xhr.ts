import { ClientRequest } from "http";
import { Errback } from "./types";

/** @hidden */
export default require("xhr") as (
  options: any,
  cb: Errback<any>
) => ClientRequest;
