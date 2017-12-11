import http from "http";
import https from "https";
import joinPath from "./joinPath";
import { parse as parseUrl } from "url";

export const isBrowser = false;

export default function(baseUrl, agentOptions, agent) {
  const baseUrlParts = parseUrl(baseUrl);
  const isTls = baseUrlParts.protocol === "https:";
  if (!agent) {
    const Agent = (isTls ? https : http).Agent;
    agent = new Agent(agentOptions);
  }
  return function request({ method, url, headers, body, expectBinary }, cb) {
    let path = baseUrlParts.pathname
      ? url.pathname
        ? joinPath(baseUrlParts.pathname, url.pathname)
        : baseUrlParts.pathname
      : url.pathname;
    const search = url.search
      ? baseUrlParts.search
        ? `${baseUrlParts.search}&${url.search.slice(1)}`
        : url.search
      : baseUrlParts.search;
    if (search) path += search;
    const options = { path, method, headers, agent };
    options.hostname = baseUrlParts.hostname;
    options.port = baseUrlParts.port;
    options.auth = baseUrlParts.auth;
    return next => {
      let callback = (err, res) => {
        callback = () => undefined;
        next();
        cb(err, res);
      };
      const req = (isTls ? https : http).request(options, res => {
        const data = [];
        res.on("data", chunk => data.push(chunk)).on("end", () => {
          res.body = Buffer.concat(data);
          if (!expectBinary) {
            res.body = res.body.toString("utf-8");
          }
          callback(null, res);
        });
      });
      req.on("error", err => {
        err.request = req;
        callback(err);
      });
      if (body) req.write(body);
      req.end();
    };
  };
}
