import Multipart from 'multi-part'

export default function toForm (fields, callback) {
  let called = false
  try {
    const form = new Multipart()
    for (const key of Object.keys(fields)) {
      let value = fields[key]
      if (value === undefined) continue
      if (
        !(value instanceof global.Buffer) &&
        (typeof value === 'object' || typeof value === 'function')
      ) {
        value = JSON.stringify(value)
      }
      form.append(key, value)
    }
    const stream = form.getStream()
    const bufs = []
    stream.on('data', (buf) => bufs.push(buf))
    stream.on('end', () => {
      if (called) return
      bufs.push(new Buffer('\r\n'))
      const body = Buffer.concat(bufs)
      const boundary = form.getBoundary()
      const headers = {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length)
      }
      called = true
      callback(null, {body, headers})
    })
    stream.on('error', (e) => {
      if (called) return
      called = true
      callback(e)
    })
  } catch (e) {
    if (called) return
    called = true
    callback(e)
  }
}
