try {
  module.exports = require("./async");
} catch (e) {
  module.exports = require("./cjs");
}
