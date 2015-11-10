import http from 'http';
import https from 'https';
import {parse as parseUrl} from 'url';
import LinkedList from 'linkedlist';

function joinPath(a = '', b = '') {
  if (!a && !b) return '';
  const leadingSlash = a.charAt(0) === '/';
  const trailingSlash = b.charAt(b.length - 1) === '/';
  const tokens = `${a}/${b}`.split('/').filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (token === '..') {
      tokens.splice(i - 1, 2);
      i--;
    } else if (token === '.') {
      tokens.splice(i, 1);
      i--;
    }
  }
  let path = tokens.join('/');
  if (leadingSlash) path = `/${path}`;
  if (trailingSlash) path = `${path}/`;
  return path;
}

function rawCopy(obj) {
  const result = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

export default function (baseUrl, agent, agentOptions) {
  const baseUrlParts = rawCopy(parseUrl(baseUrl));
  const isTls = baseUrlParts.protocol === 'https:';

  if (!agent) {
    const Agent = (isTls ? https : http).Agent;
    agent = new Agent(agentOptions);
  }

  const queue = new LinkedList();
  const maxTasks = typeof agent.maxSockets === 'number' ? agent.maxSockets * 2 : Infinity;
  let activeTasks = 0;

  function drainQueue() {
    if (!queue.length || activeTasks >= maxTasks) return;
    const task = queue.shift();
    activeTasks += 1;
    task(() => {
      activeTasks -= 1;
      drainQueue();
    });
  }

  return function request({method, url, headers, body}, cb) {
    let path = baseUrlParts.pathname ? (
      url.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : baseUrlParts.pathname
    ) : url.pathname;
    const search = url.search ? (
      baseUrlParts.search ? `${baseUrlParts.search}&${url.search.slice(1)}` : url.search
    ) : baseUrlParts.search;
    if (search) path += search;
    const options = {path, method, headers, agent};
    options.hostname = baseUrlParts.hostname;
    options.port = baseUrlParts.port;
    options.auth = baseUrlParts.auth;

    queue.push(next => {
      let callback = (...args) => {
        callback = () => undefined;
        next();
        cb.apply(this, args);
      };
      const req = (isTls ? https : http).request(options, res => {
        const data = [];
        res
        .on('data', chunk => data.push(chunk))
        .on('end', () => {
          res.body = data.join('');
          callback(null, res);
        });
      });
      req.on('error', err => {
        err.request = req;
        callback(err);
      });
      if (body) req.write(body);
      req.end();
    });

    drainQueue();
  };
}
