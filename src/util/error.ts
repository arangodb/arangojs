let ExtendableError = require("es6-error");
ExtendableError = ExtendableError.default || ExtendableError;
export default ExtendableError as typeof Error;
