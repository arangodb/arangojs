import promisify from './util/promisify';
import httperr from 'http-errors';
import extend from 'extend';
import qs from 'querystring';
import createRequest from './util/request';
import ArangoError from './error';
import Route from './route';

const MIME_JSON = /\/(json|javascript)(\W|$)/;

export default class Connection {
  constructor(config) {
    if (typeof config === 'string') {
      config = {url: config};
    }
    this.config = extend({}, Connection.defaults, config);
    this.config.agentOptions = extend({}, Connection.agentDefaults, this.config.agentOptions);
    if (!this.config.headers) this.config.headers = {};
    if (!this.config.headers['x-arango-version']) {
      this.config.headers['x-arango-version'] = this.config.arangoVersion;
    }
    this._request = createRequest(this.config.url, this.config.agent, this.config.agentOptions);
    this.promisify = promisify(this.config.promise);
  }

  _resolveUrl(opts) {
    const url = {pathname: ''};
    if (!opts.absolutePath) {
      url.pathname = `${url.pathname}/_db/${this.config.databaseName}`;
      if (opts.basePath) url.pathname = `${url.pathname}/${opts.basePath}`;
    }
    url.pathname += opts.path ? (opts.path.charAt(0) === '/' ? '' : '/') + opts.path : '';
    if (opts.qs) url.search = `?${typeof opts.qs === 'string' ? opts.qs : qs.stringify(opts.qs)}`;
    return url;
  }

  route(path) {
    return new Route(this, path);
  }

  request(opts, cb) {
    const {promise, callback} = this.promisify(cb);
    const headers = {'content-type': 'text/plain'};
    if (!opts) opts = {};
    let body = opts.body;

    if (body) {
      if (typeof body === 'object') {
        if (opts.ld) {
          body = body.map(obj => JSON.stringify(obj)).join('\r\n') + '\r\n';
          headers['content-type'] = 'application/x-ldjson';
        } else {
          body = JSON.stringify(body);
          headers['content-type'] = 'application/json';
        }
      } else {
        body = String(body);
      }
    }

    headers['content-length'] = body ? Buffer.byteLength(body, 'utf-8') : 0;

    this._request({
      url: this._resolveUrl(opts),
      headers: extend(headers, this.config.headers, opts.headers),
      method: (opts.method || 'get').toUpperCase(),
      body: body
    }, (err, res) => {
      if (err) callback(err);
      else {
        res.rawBody = res.body;
        if (res.headers['content-type'].match(MIME_JSON)) {
          try {
            res.body = JSON.parse(res.rawBody);
          } catch (e) {
            return callback(extend(e, {response: res}));
          }
        }
        if (
          res.body
          && res.body.error
          && res.body.hasOwnProperty('code')
          && res.body.hasOwnProperty('errorMessage')
          && res.body.hasOwnProperty('errorNum')
        ) {
          callback(extend(new ArangoError(res.body), {response: res}));
        } else if (res.statusCode >= 400) {
          callback(extend(httperr(res.statusCode), {response: res}));
        } else callback(null, res);
      }
    });
    return promise;
  }
}

Connection.defaults = {
  url: 'http://localhost:8529',
  databaseName: '_system',
  arangoVersion: 20300
};

Connection.agentDefaults = {
  maxSockets: 3,
  keepAlive: true,
  keepAliveMsecs: 1000
};
