import http from 'http'
import https from 'https'
import fuerte from 'fuerte'
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

export const isBrowser = false
export const isFuerte = true

export default function (baseUrl, agentOptions, agent) {
  const baseUrlParts = parseUrl(baseUrl)
  const isTls = (baseUrlParts.protocol === 'https:') || (baseUrlParts.protocol === 'vsts:')
  let connectionString = `${baseUrlParts.protocol}//${baseUrlParts.host}`
  console.log('JS -- string seen in request.fuerte.js ' + connectionString)
  const builder = new fuerte.ConnectionBuilder()
  builder.host = connectionString
  // builder.userName = baseUrlParts.username
  // builder.password = baseUrlParts.password
  // console.log('baseUrl=' + baseUrl)
  // console.log('baseUrlParts=' + inspect(baseUrlParts))

  if (!agent) {
    const Agent = (isTls ? https : http).Agent
    agent = new Agent(agentOptions)
  }

  const idleConnections = new LinkedList()
  const activeConnections = new Set()
  const queue = new LinkedList()
  const maxConnections = typeof agentOptions.maxSockets === 'number' ? agentOptions.maxSockets : Infinity

  function request ({method, url, headers, body, expectBinary}, cb) {
    let path = baseUrlParts.pathname ? (
      url.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : baseUrlParts.pathname
    ) : url.pathname
    const search = url.search ? (
      baseUrlParts.search ? `${baseUrlParts.search}&${url.search.slice(1)}` : url.search
    ) : baseUrlParts.search

    function drainQueue () {
      if (!queue.length || activeConnections.size >= maxConnections) return
      const task = queue.shift()
      const conn = idleConnections.shift() || builder.connect()
      activeConnections.add(conn)
      task(conn, () => {
        activeConnections.delete(conn)
        idleConnections.push(conn)
        drainQueue()
      })
    }

    queue.push((conn, next) => {
      let callback = (err, res) => {
        callback = () => undefined
        next()
        cb(err, res)
      }

      const req = new fuerte.Request()
      req.method = method.toLowerCase()
      const parts = path.match(/^\/_db\/([^/]+)(.*)/)
      if (!parts) return callback(new Error('Invalid path?!?'))
      req.database = parts[1]
      req.path = parts[2]
      if (body) {
        req.addBody(body)
        if (headers) {
          headers["content-type"] = undefined;
        }
      }
      if (search && search.length > 1) {
        const qs = parseQuery(search.slice(1))
        Object.keys(qs).forEach((key) => {
          if (qs[key] !== undefined) {
            req.addQueryParameter(key, String(qs[key]))
          }
        })
      }
      if (headers) {
        Object.keys(headers).forEach((key) => {
          if (headers[key] !== undefined) {
            req.addHeader(key, String(headers[key]))
          }
        })
      }

      function reqCallback (err, res) {
        if (err) {
          console.trace()
          callback(new Error(`Generic Fuerte Error #${err}`))
        } else {
          let body
          let statusCode
          let headers

          try {
            statusCode = res.responseCode
            headers = res.header
            body = res.body
            headers['content-type'] = ''
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
      }

      // console.log('JS -- sending request in request.fuerte.js ' + req)
      conn.sendRequest(req, reqCallback)
    })

    drainQueue()
  }

  const auth = baseUrlParts.auth
  delete baseUrlParts.auth
  return {request, auth, url: baseUrlParts}
}
