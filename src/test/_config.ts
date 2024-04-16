import { Config, LoadBalancingStrategy } from "../connection.js";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://127.0.0.1:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 0
);
const ARANGO_RELEASE = process.env.ARANGO_RELEASE || "";
let arangoVersion: number = 39999;
if (ARANGO_VERSION) arangoVersion = ARANGO_VERSION;
else if (ARANGO_RELEASE.includes(".")) {
  let release = ARANGO_RELEASE;
  if (release.includes(":")) release = release.split(":")[1];
  if (release.includes("-")) release = release.split(":")[0];
  const [major, minor] = release.split(".").map((v) => Number(v));
  arangoVersion = (major * 100 + minor) * 100;
}
const ARANGO_LOAD_BALANCING_STRATEGY = process.env
  .TEST_ARANGO_LOAD_BALANCING_STRATEGY as LoadBalancingStrategy | undefined;

export const config: Config & {
  arangoVersion: NonNullable<Config["arangoVersion"]>;
} = ARANGO_URL.includes(",")
  ? {
      url: ARANGO_URL.split(",").filter((s) => Boolean(s)),
      arangoVersion,
      precaptureStackTraces: true,
      loadBalancingStrategy: ARANGO_LOAD_BALANCING_STRATEGY || "ROUND_ROBIN",
    }
  : {
      url: ARANGO_URL,
      arangoVersion,
      precaptureStackTraces: true,
    };
