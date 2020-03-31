const Es6Error = require("es6-error");
export const ExtendableError: typeof Error = Es6Error.default || Es6Error;
export type ExtendableError = typeof Error;
