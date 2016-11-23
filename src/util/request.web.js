import xhr from 'xhr'
import {parse as parseUrl, format as formatUrl} from 'url'

function joinPath (a = '', b = '') {
  if (!a && !b) return ''
  const leadingSlash = a.charAt(0) === '/'
  const trailingSlash = b.charAt(b.length - 1) === '/'
  const tokens = `${a}/${b}`.split('/').filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]
    if (token === '..') {
      tokens.splice(i - 1, 2)
      i--
    } else if (token === '.') {
      tokens.splice(i, 1)
      i--
    }
  }
  let path = tokens.join('/')
  if (leadingSlash) path = `/${path}`
  if (trailingSlash) path = `${path}/`
  return path
}

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
      let callback = (...args) => {
        callback = () => undefined
        next()
        cb(...args)
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
