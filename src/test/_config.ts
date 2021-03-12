import { Config, LoadBalancingStrategy } from "../connection";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 39999
);
const ARANGO_LOAD_BALANCING_STRATEGY = process.env
  .TEST_ARANGO_LOAD_BALANCING_STRATEGY as LoadBalancingStrategy | undefined;

export const config: Config & {
  arangoVersion: NonNullable<Config["arangoVersion"]>;
} = ARANGO_URL.includes(",")
  ? {
      url: ARANGO_URL.split(",").filter((s) => Boolean(s)),
      arangoVersion: ARANGO_VERSION,
      loadBalancingStrategy: ARANGO_LOAD_BALANCING_STRATEGY || "ROUND_ROBIN",
    }
  : {
      url: ARANGO_URL,
      arangoVersion: ARANGO_VERSION,
    };
