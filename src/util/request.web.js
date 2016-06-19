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
  const i = baseUrlParts.auth ? baseUrlParts.auth.indexOf(':') : -1
  const username = i !== -1 ? baseUrlParts.auth.slice(0, i) : (baseUrlParts.auth || undefined)
  const password = i !== -1 ? baseUrlParts.auth.slice(i + 1) : (baseUrlParts.auth ? '' : undefined)
  delete baseUrlParts.auth

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

  return function request ({method, url, headers, body}, cb) {
    const auth = typeof username === 'string' ? {username, password} : {}

    if (typeof window !== 'undefined' && auth.username !== undefined && headers['Authorization'] === undefined) {
      const btoa = window.btoa ? window.btoa : window.base64.encode
      headers['Authorization'] = 'Basic ' + btoa(auth.username + ':' + auth.password)
    }

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
        responseType: 'text',
        ...options,
        ...auth,
        url: formatUrl(urlParts),
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
}
