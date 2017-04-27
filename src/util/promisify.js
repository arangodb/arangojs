const noop = () => undefined

export default function promisify (promiseClass) {
  if (promiseClass === false) {
    return function (cb) {
      return {callback: cb || noop}
    }
  }

  return function (cb) {
    const Promise = promiseClass || global.Promise

    if (cb || !Promise) {
      return {callback: cb || noop}
    }

    let callback
    const promise = new Promise((resolve, reject) => {
      callback = (err, res) => {
        if (err) reject(err)
        else resolve(res)
      }
    })

    return {callback, promise}
  }
}
