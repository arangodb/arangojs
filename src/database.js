import constructCollection, {
  DocumentCollection,
  EdgeCollection
} from "./collection";

import ArrayCursor from "./cursor";
import Connection from "./connection";
import Graph from "./graph";
import all from "./util/all";
import btoa from "./util/btoa";
import toForm from "./util/multipart";

export default class Database {
  constructor(config) {
    this._connection = new Connection(config);
    this._api = this._connection.route("/_api");
    this.name = this._connection.config.databaseName;
  }

  route(path, headers) {
    return this._connection.route(path, headers);
  }

  // Database manipulation

  useDatabase(databaseName) {
    if (this._connection.config.databaseName === false) {
      throw new Error("Can not change database from absolute URL");
    }
    this._connection.config.databaseName = databaseName;
    this._connection._databasePath = `/_db/${databaseName}`;
    this.name = databaseName;
    return this;
  }

  useBearerAuth(token) {
    this._connection.config.headers["authorization"] = `Bearer ${token}`;
    return this;
  }

  useBasicAuth(username, password) {
    this._connection.config.headers["authorization"] = `Basic ${btoa(
      `${username || "root"}:${password || ""}`
    )}`;
    return this;
  }

  get(cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/database/current",
      (err, res) => (err ? callback(err) : callback(null, res.body.result))
    );
    return promise;
  }

  createDatabase(databaseName, users, cb) {
    if (typeof users === "function") {
      cb = users;
      users = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.post(
      "/database",
      { users, name: databaseName },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  listDatabases(cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/database",
      (err, res) => (err ? callback(err) : callback(null, res.body.result))
    );
    return promise;
  }

  listUserDatabases(cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/database/user",
      (err, res) => (err ? callback(err) : callback(null, res.body.result))
    );
    return promise;
  }

  dropDatabase(databaseName, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.delete(
      `/database/${databaseName}`,
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  // Collection manipulation

  collection(collectionName) {
    return new DocumentCollection(this._connection, collectionName);
  }

  edgeCollection(collectionName) {
    return new EdgeCollection(this._connection, collectionName);
  }

  listCollections(excludeSystem, cb) {
    if (typeof excludeSystem === "function") {
      cb = excludeSystem;
      excludeSystem = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    if (typeof excludeSystem !== "boolean") excludeSystem = true;
    const resultField =
      this._connection.arangoMajor < 3 ? "collections" : "result";
    this._api.get(
      "/collection",
      { excludeSystem },
      (err, res) =>
        err ? callback(err) : callback(null, res.body[resultField])
    );
    return promise;
  }

  collections(excludeSystem, cb) {
    if (typeof excludeSystem === "function") {
      cb = excludeSystem;
      excludeSystem = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this.listCollections(
      excludeSystem,
      (err, collections) =>
        err
          ? callback(err)
          : callback(
              null,
              collections.map(info =>
                constructCollection(this._connection, info)
              )
            )
    );
    return promise;
  }

  truncate(excludeSystem, cb) {
    if (typeof excludeSystem === "function") {
      cb = excludeSystem;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this.listCollections(
      true,
      (err, collections) =>
        err
          ? callback(err)
          : all(
              collections.map(data => cb =>
                this._api.put(
                  `/collection/${data.name}/truncate`,
                  (err, res) => (err ? cb(err) : cb(null, res.body))
                )
              ),
              callback
            )
    );
    return promise;
  }

  // Graph manipulation

  graph(graphName) {
    return new Graph(this._connection, graphName);
  }

  listGraphs(cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/gharial",
      (err, res) => (err ? callback(err) : callback(null, res.body.graphs))
    );
    return promise;
  }

  graphs(cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this.listGraphs(
      (err, graphs) =>
        err
          ? callback(err)
          : callback(null, graphs.map(info => this.graph(info._key)))
    );
    return promise;
  }

  // Queries

  transaction(collections, action, params, lockTimeout, cb) {
    if (typeof lockTimeout === "function") {
      cb = lockTimeout;
      lockTimeout = undefined;
    }
    if (typeof params === "function") {
      cb = params;
      params = undefined;
    }
    if (typeof params === "number") {
      lockTimeout = params;
      params = undefined;
    }
    if (typeof collections === "string" || Array.isArray(collections)) {
      collections = { write: collections };
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.post(
      "/transaction",
      { collections, action, params, lockTimeout },
      (err, res) => (err ? callback(err) : callback(null, res.body.result))
    );
    return promise;
  }

  query(query, bindVars, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = undefined;
    }
    if (typeof bindVars === "function") {
      cb = bindVars;
      bindVars = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    if (query && query.query) {
      if (!opts) opts = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    }
    if (query && typeof query.toAQL === "function") {
      query = query.toAQL();
    }
    this._api.post(
      "/cursor",
      { ...opts, query, bindVars },
      (err, res) =>
        err
          ? callback(err)
          : callback(null, new ArrayCursor(this._connection, res.body))
    );
    return promise;
  }

  // Function management

  listFunctions(cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/aqlfunction",
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  createFunction(name, code, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.post(
      "/aqlfunction",
      { name, code },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  dropFunction(name, group, cb) {
    if (typeof group === "function") {
      cb = group;
      group = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.delete(
      `/aqlfunction/${name}`,
      { group: Boolean(group) },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  // Service management

  listServices(cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/foxx",
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  installService(mount, source, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = undefined;
    }
    const { configuration, dependencies, ...qs } = opts || {};
    const { promise, callback } = this._connection.promisify(cb);
    toForm(
      {
        configuration,
        dependencies,
        source
      },
      (err, req) =>
        err
          ? callback(err)
          : this._api.request(
              {
                method: "POST",
                path: "/foxx",
                rawBody: req.body,
                qs: { ...qs, mount },
                headers: req.headers
              },
              (err, res) => (err ? callback(err) : callback(null, res.body))
            )
    );
    return promise;
  }

  upgradeService(mount, source, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = undefined;
    }
    const { configuration, dependencies, ...qs } = opts || {};
    const { promise, callback } = this._connection.promisify(cb);
    toForm(
      {
        configuration,
        dependencies,
        source
      },
      (err, req) =>
        err
          ? callback(err)
          : this._api.request(
              {
                method: "PATCH",
                path: "/foxx/service",
                rawBody: req.body,
                qs: { ...qs, mount },
                headers: req.headers
              },
              (err, res) => (err ? callback(err) : callback(null, res.body))
            )
    );
    return promise;
  }

  replaceService(mount, source, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = undefined;
    }
    const { configuration, dependencies, ...qs } = opts || {};
    const { promise, callback } = this._connection.promisify(cb);
    toForm(
      {
        configuration,
        dependencies,
        source
      },
      (err, req) =>
        err
          ? callback(err)
          : this._api.request(
              {
                method: "PUT",
                path: "/foxx/service",
                rawBody: req.body,
                qs: { ...qs, mount },
                headers: req.headers
              },
              (err, res) => (err ? callback(err) : callback(null, res.body))
            )
    );
    return promise;
  }

  uninstallService(mount, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.delete(
      "/foxx/service",
      { ...opts, mount },
      err => (err ? callback(err) : callback(null))
    );
    return promise;
  }

  getService(mount, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/foxx/service",
      { mount },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  getServiceConfiguration(mount, minimal, cb) {
    if (typeof minimal === "function") {
      cb = minimal;
      minimal = undefined;
    }
    if (typeof minimal !== "boolean") {
      minimal = false;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get("/foxx/configuration", { mount, minimal }, (err, res) => {
      if (err) return callback(err);
      if (minimal) {
        const values = {};
        for (const key of Object.keys(res.body)) {
          values[key] = res.body[key].current;
        }
        res.body = { values };
      }
      callback(null, res.body);
    });
    return promise;
  }

  updateServiceConfiguration(mount, cfg, minimal, cb) {
    if (typeof minimal === "function") {
      cb = minimal;
      minimal = undefined;
    }
    if (typeof minimal !== "boolean") {
      minimal = false;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.patch(
      "/foxx/configuration",
      cfg,
      { mount, minimal },
      (err, res) => {
        if (err) return callback(err);
        let body = res.body;
        if (minimal || !body.values || !body.values.title) {
          return callback(null, body);
        }
        this.getServiceConfiguration(mount, minimal, (err, res) => {
          if (err) return callback(err);
          if (body.warnings) {
            for (const key of Object.keys(res)) {
              res.body[key].warning = body.warnings[key];
            }
          }
          callback(null, res.body);
        });
      }
    );
    return promise;
  }

  replaceServiceConfiguration(mount, cfg, minimal, cb) {
    if (typeof minimal === "function") {
      cb = minimal;
      minimal = undefined;
    }
    if (typeof minimal !== "boolean") {
      minimal = false;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.put(
      "/foxx/configuration",
      cfg,
      { mount, minimal },
      (err, res) => {
        if (err) return callback(err);
        let body = res.body;
        if (minimal || !body.values || !body.values.title) {
          return callback(null, body);
        }
        this.getServiceConfiguration(mount, minimal, (err, res) => {
          if (err) return callback(err);
          if (body.warnings) {
            for (const key of Object.keys(res)) {
              res.body[key].warning = body.warnings[key];
            }
          }
          callback(null, res.body);
        });
      }
    );
    return promise;
  }

  getServiceDependencies(mount, minimal, cb) {
    if (typeof minimal === "function") {
      cb = minimal;
      minimal = undefined;
    }
    if (typeof minimal !== "boolean") {
      minimal = false;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get("/foxx/dependencies", { mount, minimal }, (err, res) => {
      if (err) return callback(err);
      if (minimal) {
        const values = {};
        for (const key of Object.keys(res.body)) {
          values[key] = res.body[key].current;
        }
        res.body = { values };
      }
      callback(null, res.body);
    });
    return promise;
  }

  updateServiceDependencies(mount, cfg, minimal, cb) {
    if (typeof minimal === "function") {
      cb = minimal;
      minimal = undefined;
    }
    if (typeof minimal !== "boolean") {
      minimal = false;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.patch(
      "/foxx/dependencies",
      cfg,
      { mount, minimal },
      (err, res) => {
        if (err) return callback(err);
        let body = res.body;
        if (minimal || !body.values || !body.values.title) {
          return callback(null, body);
        }
        this.getServiceDependencies(mount, minimal, (err, res) => {
          if (err) return callback(err);
          if (body.warnings) {
            for (const key of Object.keys(res)) {
              res.body[key].warning = body.warnings[key];
            }
          }
          callback(null, res.body);
        });
      }
    );
    return promise;
  }

  replaceServiceDependencies(mount, cfg, minimal, cb) {
    if (typeof minimal === "function") {
      cb = minimal;
      minimal = undefined;
    }
    if (typeof minimal !== "boolean") {
      minimal = false;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.put("/foxx/dependencies", cfg, { mount, minimal }, (err, res) => {
      if (err) return callback(err);
      let body = res.body;
      if (minimal || !body.values || !body.values.title) {
        return callback(null, body);
      }
      this.getServiceDependencies(mount, minimal, (err, res) => {
        if (err) return callback(err);
        if (body.warnings) {
          for (const key of Object.keys(res)) {
            res.body[key].warning = body.warnings[key];
          }
        }
        callback(null, res.body);
      });
    });
    return promise;
  }

  enableServiceDevelopmentMode(mount, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.post(
      "/foxx/development",
      undefined,
      { mount },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  disableServiceDevelopmentMode(mount, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.delete(
      "/foxx/development",
      { mount },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  listServiceScripts(mount, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/foxx/scripts",
      { mount },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  runServiceScript(mount, name, args, cb) {
    if (typeof args === "function") {
      cb = args;
      args = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.post(
      `/foxx/scripts/${name}`,
      args,
      { mount },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  runServiceTests(mount, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.post(
      "/foxx/tests",
      undefined,
      { ...opts, mount },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  getServiceReadme(mount, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/foxx/readme",
      { mount },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  getServiceDocumentation(mount, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.get(
      "/foxx/swagger",
      { mount },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  downloadService(mount, cb) {
    const { promise, callback } = this._connection.promisify(cb);
    this._api.request(
      {
        method: "POST",
        path: "/foxx/download",
        qs: { mount },
        expectBinary: true
      },
      (err, res) => (err ? callback(err) : callback(null, res.body))
    );
    return promise;
  }

  commitLocalServiceState(replace, cb) {
    if (typeof replace === "function") {
      cb = replace;
      replace = undefined;
    }
    const { promise, callback } = this._connection.promisify(cb);
    this._api.post(
      "/foxx/commit",
      undefined,
      { replace },
      (err, res) => (err ? callback(err) : callback(null))
    );
    return promise;
  }
}
