import { Config } from "../connection";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 39999
);

export const config: {
  url: NonNullable<Config["url"]>;
  arangoVersion: NonNullable<Config["arangoVersion"]>;
  loadBalancingStrategy?: Config["loadBalancingStrategy"];
} = ARANGO_URL.includes(",")
  ? {
      url: ARANGO_URL.split(",").filter((s) => Boolean(s)),
      arangoVersion: ARANGO_VERSION,
      loadBalancingStrategy: "ROUND_ROBIN",
    }
  : {
      url: ARANGO_URL,
      arangoVersion: ARANGO_VERSION,
    };
