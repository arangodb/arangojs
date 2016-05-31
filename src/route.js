export default class Route {
  constructor (connection, path, headers) {
    this._connection = connection
    this._path = path || ''
    this._headers = headers
  }

  route (path, headers) {
    if (!path) path = ''
    else if (path.charAt(0) !== '/') path = `/${path}`
    return new Route(
      this._connection,
      this._path + path,
      {...this._headers, ...headers}
    )
  }

  request (opts, callback) {
    opts = {...opts}
    opts.basePath = this._path
    opts.headers = {...this._headers, ...opts.headers}
    return this._connection.request(opts, callback)
  }

  get (path, qs, headers, callback) {
    if (typeof path !== 'string') {
      callback = qs
      qs = path
      path = undefined
    }
    if (typeof qs === 'function') {
      callback = qs
      qs = undefined
    }
    if (typeof headers === 'function') {
      callback = headers
      headers = undefined
    }
    if (!path) path = ''
    else if (this._path && path.charAt(0) !== '/') path = `/${path}`
    return this.request({path, qs, headers, method: 'get'}, callback)
  }

  post (path, body, qs, headers, callback) {
    if (typeof path !== 'string') {
      callback = qs
      qs = body
      body = path
      path = undefined
    }
    if (typeof qs === 'function') {
      callback = qs
      qs = undefined
    }
    if (typeof body === 'function') {
      callback = body
      body = undefined
    }
    if (typeof headers === 'function') {
      callback = headers
      headers = undefined
    }
    if (!path) path = ''
    else if (this._path && path.charAt(0) !== '/') path = `/${path}`
    return this.request({path, body, qs, headers, method: 'post'}, callback)
  }

  put (path, body, qs, headers, callback) {
    if (typeof path !== 'string') {
      callback = body
      body = qs
      qs = path
      path = undefined
    }
    if (typeof qs === 'function') {
      callback = qs
      qs = undefined
    }
    if (typeof body === 'function') {
      callback = body
      body = undefined
    }
    if (typeof headers === 'function') {
      callback = headers
      headers = undefined
    }
    if (!path) path = ''
    else if (this._path && path.charAt(0) !== '/') path = `/${path}`
    return this.request({path, body, qs, headers, method: 'put'}, callback)
  }

  patch (path, body, qs, headers, callback) {
    if (typeof path !== 'string') {
      callback = body
      body = qs
      qs = path
      path = undefined
    }
    if (typeof qs === 'function') {
      callback = qs
      qs = undefined
    }
    if (typeof body === 'function') {
      callback = body
      body = undefined
    }
    if (typeof headers === 'function') {
      callback = headers
      headers = undefined
    }
    if (!path) path = ''
    else if (this._path && path.charAt(0) !== '/') path = `/${path}`
    return this.request({path, body, qs, headers, method: 'patch'}, callback)
  }

  delete (path, qs, headers, callback) {
    if (typeof path !== 'string') {
      callback = qs
      qs = path
      path = undefined
    }
    if (typeof qs === 'function') {
      callback = qs
      qs = undefined
    }
    if (typeof headers === 'function') {
      callback = headers
      headers = undefined
    }
    if (!path) path = ''
    else if (this._path && path.charAt(0) !== '/') path = `/${path}`
    return this.request({path, qs, headers, method: 'delete'}, callback)
  }

  head (path, qs, headers, callback) {
    if (typeof path !== 'string') {
      callback = qs
      qs = path
      path = undefined
    }
    if (typeof qs === 'function') {
      callback = qs
      qs = undefined
    }
    if (typeof headers === 'function') {
      callback = headers
      headers = undefined
    }
    if (!path) path = ''
    else if (this._path && path.charAt(0) !== '/') path = `/${path}`
    return this.request({path, qs, headers, method: 'head'}, callback)
  }
}
