import fuerte from 'fuerte/arango-node-driver'
import vpack from 'node-velocypack/build/Debug/node-velocypack.node'
import {parse as parseQuery} from 'querystring'
import {parse as parseUrl} from 'url'

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

  const builder = new fuerte.ConnectionBuilder()
  const conn = builder.host(`vst://${baseUrlParts.host}`).connect()
  let activeConnections = 0
  let interval

  function startPolling () {
    activeConnections++
    if (activeConnections > 1) return
    interval = setInterval(() => fuerte.poll(), 100)
  }

  function stopPolling () {
    activeConnections--
    if (activeConnections > 0) return
    clearInterval(interval)
  }

  function request ({method, url, headers, body, expectBinary}, cb) {
    let path = baseUrlParts.pathname ? (
      url.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : baseUrlParts.pathname
    ) : url.pathname
    const search = url.search ? (
      baseUrlParts.search ? `${baseUrlParts.search}&${url.search.slice(1)}` : url.search
    ) : baseUrlParts.search

    const req = new fuerte.Request()
    req.setRestVerb(method.toLowerCase())
    const parts = path.match(/^\/_db\/([^/]+)(.*)/)
    if (!parts) return cb(new Error('Invalid path?!?'))
    req.setDatabase(parts[1])
    req.setPath(parts[2])
    if (body) req.addVPack(vpack.encode(body))
    if (search) {
      const qs = parseQuery(search)
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
      stopPolling()
      const body = (
        res.notNull()
        ? vpack.decode(res.payload())
        : null
      )
      cb(null, {
        statusCode: res.getResponseCode(),
        headers: {},
        body
      })
    }
    function onFailure (code, req, res) {
      stopPolling()
      cb(new Error(``))
    }
    conn.sendRequest(req, onFailure, onSuccess)
    startPolling()
  }

  const auth = baseUrlParts.auth
  delete baseUrlParts.auth
  return {request, auth, url: baseUrlParts}
}
