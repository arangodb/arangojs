import http from 'http'
import https from 'https'
import {parse as parseUrl} from 'url'
import LinkedList from 'linkedlist'
import joinPath from './joinPath'

export const isBrowser = false

export default function (baseUrl, agentOptions, agent) {
  const baseUrlParts = parseUrl(baseUrl)
  const isTls = baseUrlParts.protocol === 'https:'

  if (!agent) {
    const Agent = (isTls ? https : http).Agent
    agent = new Agent(agentOptions)
  }

  const queue = new LinkedList()
  const maxTasks = typeof agent.maxSockets === 'number' ? agent.maxSockets * 2 : Infinity
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
    let path = baseUrlParts.pathname ? (
      url.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : baseUrlParts.pathname
    ) : url.pathname
    const search = url.search ? (
      baseUrlParts.search ? `${baseUrlParts.search}&${url.search.slice(1)}` : url.search
    ) : baseUrlParts.search
    if (search) path += search
    const options = {path, method, headers, agent}
    options.hostname = baseUrlParts.hostname
    options.port = baseUrlParts.port
    options.auth = baseUrlParts.auth

    queue.push((next) => {
      let callback = (err, res) => {
        callback = () => undefined
        next()
        cb(err, res)
      }
      const req = (isTls ? https : http).request(options, (res) => {
        const data = []
        res
        .on('data', (chunk) => data.push(chunk))
        .on('end', () => {
          res.body = Buffer.concat(data)
          if (!expectBinary) {
            res.body = res.body.toString('utf-8')
          }
          callback(null, res)
        })
      })
      req.on('error', (err) => {
        err.request = req
        callback(err)
      })
      if (body) req.write(body)
      req.end()
    })

    drainQueue()
  }

  const auth = baseUrlParts.auth
  delete baseUrlParts.auth
  return {request, auth, url: baseUrlParts}
}
