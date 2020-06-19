/**
 * Wrapper around the `xhr` module for HTTP(S) requests in the browser.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

import { ClientRequest } from "http";
import { Errback } from "../util/types";

/**
 * @internal
 * @hidden
 */
export default require("xhr") as (
  options: any,
  cb: Errback<any>
) => ClientRequest;
