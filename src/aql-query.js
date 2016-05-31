export default function aql (strings, ...args) {
  const bindVars = {}
  const bindVals = []
  let query = strings[0]
  for (let i = 0; i < args.length; i++) {
    const rawValue = args[i]
    let value = rawValue
    if (rawValue && typeof rawValue.toAQL === 'function') {
      query += `${rawValue.toAQL()}${strings[i + 1]}`
      continue
    }
    const index = bindVals.indexOf(rawValue)
    const isKnown = index !== -1
    let name = `value${isKnown ? index : bindVals.length}`
    if (rawValue && rawValue.isArangoCollection) {
      name = `@${name}`
      value = rawValue.name
    }
    if (!isKnown) {
      bindVals.push(rawValue)
      bindVars[name] = value
    }
    query += `@${name}${strings[i + 1]}`
  }
  return {query, bindVars}
}
