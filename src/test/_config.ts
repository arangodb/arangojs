import { ConfigOptions, LoadBalancingStrategy } from "../configuration.js";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://127.0.0.1:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 0,
);
const ARANGO_RELEASE = process.env.ARANGO_RELEASE || "";
let arangoVersion: number = 39999;
if (ARANGO_VERSION) arangoVersion = ARANGO_VERSION;
else if (ARANGO_RELEASE.includes(".")) {
  let tag = ARANGO_RELEASE;
  if (tag.includes(":")) tag = tag.split(":").pop() ?? tag;
  // e.g. "4.0-nightly" -> "4.0" so minor is numeric (docker tags are not semver tuples)
  const core = tag.split("-")[0] ?? tag;
  const parts = core.split(".").map((v) => Number(v));
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  arangoVersion = (major * 100 + minor) * 100;
}
const ARANGO_LOAD_BALANCING_STRATEGY = process.env
  .TEST_ARANGO_LOAD_BALANCING_STRATEGY as LoadBalancingStrategy | undefined;

export const config: ConfigOptions & {
  arangoVersion: NonNullable<ConfigOptions["arangoVersion"]>;
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

/** Multi-coordinator URL (cluster / active failover) in CI. */
export const isClusterRuntime =
  Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE";
