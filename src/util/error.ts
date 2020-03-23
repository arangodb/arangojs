let ExtendableError = require("es6-error");
ExtendableError = ExtendableError.default || ExtendableError;

/** @hidden */
export default ExtendableError as typeof Error;
