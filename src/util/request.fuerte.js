import fuerte from 'fuerte'
import vpack from 'node-velocypack'
import {parse as parseQuery} from 'querystring'
import {parse as parseUrl} from 'url'
import LinkedList from 'linkedlist'

const MIME_VPACK = /\/(x-velocypack)(\W|$)/

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

export default function (baseUrl, agentOptions) {
  const baseUrlParts = parseUrl(baseUrl)
  let connectionString = `${baseUrlParts.protocol}//${baseUrlParts.host}`
  console.log('JS -- string seen in request.fuerte.js ' + connectionString)
  const builder = new fuerte.ConnectionBuilder().host(connectionString)
  let interval
  let counter = 0

  const idleConnections = new LinkedList()
  const activeConnections = new Set()
  const queue = new LinkedList()
  const maxConnections = typeof agentOptions.maxSockets === 'number' ? agentOptions.maxSockets : Infinity

  function drainQueue () {
    if (!queue.length || activeConnections.size >= maxConnections) return
    const task = queue.shift()
    if (activeConnections.size === 0) {
      interval = setInterval(() => {
        fuerte.poll()
      })
    }
    const conn = idleConnections.shift() || builder.connect()
    activeConnections.add(conn)
    task(conn, () => {
      activeConnections.delete(conn)
      idleConnections.push(conn)
      if (activeConnections.size === 0) {
        clearInterval(interval)
        interval = undefined
      }
      drainQueue()
    })
  }

  function request ({method, url, headers, body, expectBinary}, cb) {
    let path = baseUrlParts.pathname ? (
      url.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : baseUrlParts.pathname
    ) : url.pathname
    const search = url.search ? (
      baseUrlParts.search ? `${baseUrlParts.search}&${url.search.slice(1)}` : url.search
    ) : baseUrlParts.search
    const REQID = '#' + (++counter) + ' ' + method.toUpperCase() + ' ' + path

    queue.push((conn, next) => {
      const START = Date.now()
      const timeout = setInterval(() => {
        const TIME = Date.now() - START
        console.error(REQID, 'STILL WAITING after', TIME, 'ms', '(active:', activeConnections.size + ', polling:', (interval !== undefined) + ')')
      }, 10000)

      let callback = (...args) => {
        clearInterval(timeout)
        const TIME = Date.now() - START
        if (TIME > 10000) {
          console.error(REQID, 'FINALLY FINISHED after', TIME, 'ms')
        }
        callback = () => undefined
        next()
        cb(...args)
      }

      const req = new fuerte.Request()
      req.setRestVerb(method.toLowerCase())
      const parts = path.match(/^\/_db\/([^/]+)(.*)/)
      if (!parts) return callback(new Error('Invalid path?!?'))
      req.setDatabase(parts[1])
      req.setPath(parts[2])
      if (body) req.addVPack(body)
      if (search && search.length > 1) {
        const qs = parseQuery(search.slice(1))
        Object.keys(qs).forEach((key) => {
          if (qs[key] !== undefined) {
            req.addParameter(key, String(qs[key]))
          }
        })
      }
      if (headers) {
        Object.keys(headers).forEach((key) => {
          if (headers[key] !== undefined) {
            req.addMeta(key, String(headers[key]))
          }
        })
      }

      function onSuccess (req, res) {
        let body
        let statusCode
        let headers

        try {
          statusCode = res.getResponseCode()
          headers = res.getMeta()
          body = res.notNull() ? res.payload() : null
          if (body && headers['content-type'] && headers['content-type'].match(MIME_VPACK)) {
            body = vpack.decode(body)
          }
        } catch (e) {
          console.trace() // TODO remove this
          callback(e)
          return
        }
        callback(null, {
          statusCode,
          headers,
          body
        })
      }

      function onFailure (code, req, res) {
        console.trace()
        callback(new Error(`Generic Fuerte Error #${code}`))
      }

      conn.sendRequest(req, onFailure, onSuccess)
    })

    try {
      drainQueue()
    } catch (e) {
      console.trace() // TODO remove this
      cb(e)
    }
  }

  const auth = baseUrlParts.auth
  delete baseUrlParts.auth
  return {request, auth, url: baseUrlParts}
}
