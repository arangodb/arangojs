import fuerte from 'fuerte'
import vpack from 'node-velocypack'
import {parse as parseQuery} from 'querystring'
import {parse as parseUrl} from 'url'
import LinkedList from 'linkedlist'

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
  const builder = new fuerte.ConnectionBuilder()
  const conn = builder.host(connectionString).connect()
  let activeTasks = 0
  let interval
  let counter = 0
  let polling = false

  const queue = new LinkedList()
  const maxTasks = typeof agentOptions.maxSockets === 'number' ? agentOptions.maxSockets : Infinity

  function drainQueue () {
    if (!queue.length || activeTasks >= maxTasks) return
    const task = queue.shift()
    if (activeTasks === 0) {
      polling = true
      interval = setInterval(() => {
        fuerte.poll()
      }, 100)
    }
    activeTasks += 1
    task(() => {
      activeTasks -= 1
      if (activeTasks === 0) {
        polling = false
        clearInterval(interval)
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

    queue.push((next) => {
      const START = Date.now()
      const timeout = setInterval(() => {
        const TIME = Date.now() - START
        console.error(REQID, 'STILL WAITING after', TIME, 'ms', '(active:', activeTasks + ', polling:', polling + ')')
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
      if (body) req.addVPack(vpack.encode(body))
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
          body = (
            res.notNull()
            ? vpack.decode(res.payload())
            : null
          )
          statusCode = res.getResponseCode()
          headers = res.getMeta()
        } catch (e) {
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
        callback(new Error(`Generic Fuerte Error #${code}`))
      }

      conn.sendRequest(req, onFailure, onSuccess)
    })

    drainQueue()
  }

  const auth = baseUrlParts.auth
  delete baseUrlParts.auth
  return {request, auth, url: baseUrlParts}
}
