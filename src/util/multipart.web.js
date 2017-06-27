export default function toForm (fields, callback) {
  let form
  try {
    form = new global.FormData()
    for (const key of Object.keys(fields)) {
      let value = fields[key]
      if (value === undefined) continue
      if (
        !(value instanceof global.Blob) &&
        (typeof value === 'object' || typeof value === 'function')
      ) {
        value = JSON.stringify(value)
      }
      form.append(key, value)
    }
  } catch (e) {
    callback(e)
    return
  }
  callback(null, {body: form})
}
