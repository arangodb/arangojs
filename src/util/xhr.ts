import { ClientRequest } from "http";
import { Errback } from "./types";

export default require("xhr") as (
  options: any,
  cb: Errback<any>
) => ClientRequest;
