/**
 * TODO
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

import { ClientRequest } from "http";
import { Errback } from "../util/types";

export default require("xhr") as (
  options: any,
  cb: Errback<any>
) => ClientRequest;
