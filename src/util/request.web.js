import xhr from 'xhr'
import {parse as parseUrl, format as formatUrl} from 'url'
import joinPath from './joinPath'

export const isBrowser = true

export default function (baseUrl, options) {
  if (!options) options = {}
  const baseUrlParts = parseUrl(baseUrl)

  const queue = []
  const maxTasks = typeof options.maxSockets === 'number' ? options.maxSockets * 2 : Infinity
  let activeTasks = 0

  function drainQueue () {
    if (!queue.length || activeTasks >= maxTasks) return
    const task = queue.shift()
    activeTasks += 1
    task(() => {
      activeTasks -= 1
      drainQueue()
    })
  }

  function request ({method, url, headers, body, expectBinary}, cb) {
    const urlParts = {
      ...baseUrlParts,
      pathname: url.pathname ? (
        baseUrlParts.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : url.pathname
      ) : baseUrlParts.pathname,
      search: url.search ? (
        baseUrlParts.search ? `${baseUrlParts.search}&${url.search.slice(1)}` : url.search
      ) : baseUrlParts.search
    }

    queue.push((next) => {
      let callback = (err, res) => {
        callback = () => undefined
        next()
        cb(err, res)
      }
      const req = xhr({
        responseType: expectBinary ? 'blob' : 'text',
        ...options,
        url: formatUrl(urlParts),
        withCredentials: true,
        useXDR: true,
        body,
        method,
        headers
      }, (err, res) => {
        if (!err) callback(null, res)
        else {
          err.request = req
          callback(err)
        }
      })
    })

    drainQueue()
  }

  const auth = baseUrlParts.auth
  delete baseUrlParts.auth
  return {request, auth, url: baseUrlParts}
}
