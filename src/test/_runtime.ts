/** Matches the runtime check used by the asynchronous transaction context. */
export const isNodeRuntime =
  typeof process !== "undefined" &&
  typeof process.versions === "object" &&
  process.versions !== null &&
  typeof process.versions.node === "string";
