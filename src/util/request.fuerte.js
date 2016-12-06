import {fuerte, vpack} from 'fuerte/arango-node-driver'
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

  const queue = new LinkedList()
  const maxTasks = typeof agentOptions.maxSockets === 'number' ? agentOptions.maxSockets * 2 : Infinity
  const idleConnections = new LinkedList()
  const activeConnections = new Set()

  function drainQueue () {
    if (!queue.length || activeConnections.size >= maxTasks) return
    const task = queue.shift()
    let conn
    if (idleConnections.length) conn = idleConnections.shift()
    else {
      const server = new fuerte.Server(`${baseUrlParts.protocol}//${baseUrlParts.host}`)
      conn = server.makeConnection()
    }
    activeConnections.add(conn)
    task(conn, () => {
      activeConnections.delete(conn)
      idleConnections.push(conn)
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

    queue.push((conn, next) => {
      let callback = (...args) => {
        callback = () => undefined
        next()
        cb(...args)
      }

      const connUrl = new fuerte.ConnectionUrl()
      connUrl.setServerUrl(`${baseUrlParts.protocol}//${baseUrlParts.host}`)
      const parts = path.match(/^\/_db\/([^\/]+)(.*)/)
      if (!parts) return callback(new Error('Invalid path?!?'))
      connUrl.setDbName(parts[1])
      connUrl.setTailUrl(parts[2])
      conn.reset()
      conn.setHeaderOpts()
      conn.setUrl(connUrl)
      switch (method) {
        case 'POST':
          conn.setPostField(vpack.encode(body))
          conn.setPostReq()
          conn.setBuffer()
          break
        case 'PUT':
          conn.setPostField(vpack.encode(body))
          conn.setPutReq()
          conn.setBuffer()
          break
        case 'PATCH':
          conn.setPostField(vpack.encode(body))
          conn.setPatchReq()
          conn.setBuffer()
          break
        case 'GET':
          conn.setGetReq()
          conn.setBuffer()
          break
        case 'DELETE':
          conn.setPostField(vpack.encode(body))
          conn.setDeleteReq()
          conn.setBuffer()
          break
        default:
          return callback(new Error(`Method not implemented: "${method}"`))
          break
      }
      conn.SetAsynchronous(true)
      function run () {
        try {
          conn.Run()
          if (conn.IsRunning()) setImmediate(run)
          else {
            const result = conn.Result()
            callback(null, {
              body: vpack.decode(result),
              statusCode: conn.ResponseCode(),
              headers: {}
            })
          }
        } catch (e) {
          callback(e)
        }
      }
      run()
    })

    drainQueue()
  }

  const auth = baseUrlParts.auth
  delete baseUrlParts.auth
  return {request, auth, url: baseUrlParts}
}
