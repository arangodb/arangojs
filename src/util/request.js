try {
  module.exports = require('./request.fuerte')
} catch (e) {
  console.warn('Failed to load fuerte driver')
  module.exports = require('./request.node')
}
