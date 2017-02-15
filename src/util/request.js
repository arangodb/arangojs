console.log('TODO fall back to node driver on failure')
try {
  module.exports = require('./request.fuerte')
} catch (e) {
  console.warn('Failed to load fuerte driver')
  throw e
  // module.exports = require('./request.node')
}
