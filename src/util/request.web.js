/*eslint-env browser */
import { format as formatUrl, parse as parseUrl } from "url";

import joinPath from "./joinPath";
import xhr from "xhr";

export const isBrowser = true;

function omit(obj, keys) {
  const result = {};
  for (const key of obj) {
    if (keys.includes(key)) continue;
    result[key] = obj[key];
  }
  return result;
}

export default function(baseUrl, agentOptions) {
  const baseUrlParts = parseUrl(baseUrl);
  const options = omit(agentOptions, [
    "keepAlive",
    "keepAliveMsecs",
    "maxSockets"
  ]);
  return function request({ method, url, headers, body, expectBinary }, cb) {
    const urlParts = {
      ...baseUrlParts,
      pathname: url.pathname
        ? baseUrlParts.pathname
          ? joinPath(baseUrlParts.pathname, url.pathname)
          : url.pathname
        : baseUrlParts.pathname,
      search: url.search
        ? baseUrlParts.search
          ? `${baseUrlParts.search}&${url.search.slice(1)}`
          : url.search
        : baseUrlParts.search
    };

    return next => {
      let callback = (err, res) => {
        callback = () => undefined;
        next();
        cb(err, res);
      };
      const req = xhr(
        {
          responseType: expectBinary ? "blob" : "text",
          ...options,
          url: formatUrl(urlParts),
          withCredentials: true,
          useXDR: true,
          body,
          method,
          headers
        },
        (err, res) => {
          if (!err) callback(null, res);
          else {
            err.request = req;
            callback(err);
          }
        }
      );
    };
  };
}
