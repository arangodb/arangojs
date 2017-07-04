if (process.env.ARANGOJS_AVOID_FUERTE_DRIVER) {
  module.exports = require('./request.node')
} else {
  try {
    // Try to use fuerte driver.
    module.exports = require('./request.fuerte')
  } catch (e) {
    // Fallback to node driver.
    module.exports = require('./request.node')
  }
}