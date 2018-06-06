import { AqlLiteral, AqlQuery, isAqlLiteral, isAqlQuery } from "./aql-query";
import {
  ArangoCollection,
  DocumentCollection,
  EdgeCollection,
  constructCollection,
  isArangoCollection
} from "./collection";
import { Config, Connection } from "./connection";

import { ArrayCursor } from "./cursor";
import { Graph } from "./graph";
import { Route } from "./route";
import { btoa } from "./util/btoa";
import { toForm } from "./util/multipart";

function colToString(collection: string | ArangoCollection): string {
  if (isArangoCollection(collection)) {
    return String(collection.name);
  } else return String(collection);
}

export type CollectionName =
  | string
  | { isArangoCollection: true; name: string };
export type TransactionCollections = {
  write?: CollectionName | CollectionName[];
  read?: CollectionName | CollectionName[];
};
export type TrCols = CollectionName | CollectionName[] | TransactionCollections;

export type TransactionOptions = {
  lockTimeout?: number;
  maxTransactionSize?: number;
  intermediateCommitCount?: number;
  intermediateCommitSize?: number;
  waitForSync?: boolean;
};

export type ServiceOptions = {
  [key: string]: any;
  configuration?: { [key: string]: any };
  dependencies?: { [key: string]: any };
};

export class Database {
  private _connection: Connection;

  constructor(config?: Config) {
    this._connection = new Connection(config);
    this.useBasicAuth();
  }

  get name(): string | null {
    return this._connection.getDatabaseName() || null;
  }

  route(path?: string, headers?: Object): Route {
    return new Route(this._connection, path, headers);
  }

  async acquireHostList() {
    if (!this._connection.getDatabaseName()) {
      throw new Error("Cannot acquire host list with absolute URL");
    }
    const urls: string[] = await this._connection.request(
      { path: "/_api/cluster/endpoints" },
      res => res.body.endpoints.map((endpoint: any) => endpoint.endpoint)
    );
    this._connection.addToHostList(urls);
  }

  // Database manipulation

  useDatabase(databaseName: string) {
    this._connection.setDatabaseName(databaseName);
    return this;
  }

  useBearerAuth(token: string) {
    this._connection.setHeader("authorization", `Bearer ${token}`);
    return this;
  }

  useBasicAuth(username: string = "root", password: string = "") {
    this._connection.setHeader(
      "authorization",
      `Basic ${btoa(`${username}:${password}`)}`
    );
    return this;
  }

  get() {
    return this._connection.request(
      { path: "/_api/database/current" },
      res => res.body.result
    );
  }

  createDatabase(databaseName: string, users?: string[]) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/database",
        body: { users, name: databaseName }
      },
      res => res.body
    );
  }

  listDatabases() {
    return this._connection.request(
      { path: "/_api/database" },
      res => res.body.result
    );
  }

  listUserDatabases() {
    return this._connection.request(
      { path: "/_api/database/user" },
      res => res.body.result
    );
  }

  dropDatabase(databaseName: string) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/database/${databaseName}`
      },
      res => res.body
    );
  }

  // Collection manipulation

  collection(collectionName: string) {
    return new DocumentCollection(this._connection, collectionName);
  }

  edgeCollection(collectionName: string) {
    return new EdgeCollection(this._connection, collectionName);
  }

  listCollections(excludeSystem: boolean = true) {
    return this._connection.request(
      {
        path: "/_api/collection",
        qs: { excludeSystem }
      },
      res =>
        this._connection.arangoMajor <= 2
          ? res.body.collections
          : res.body.result
    );
  }

  async collections(excludeSystem: boolean = true) {
    const collections = await this.listCollections(excludeSystem);
    return collections.map((data: any) =>
      constructCollection(this._connection, data)
    );
  }

  async truncate(excludeSystem: boolean = true) {
    const collections = await this.listCollections(excludeSystem);
    return await Promise.all(
      collections.map((data: any) =>
        this._connection.request(
          {
            method: "PUT",
            path: `/_api/collection/${data.name}/truncate`
          },
          res => res.body
        )
      )
    );
  }

  // Graph manipulation

  graph(graphName: string) {
    return new Graph(this._connection, graphName);
  }

  listGraphs() {
    return this._connection.request(
      { path: "/_api/gharial" },
      res => res.body.graphs
    );
  }

  async graphs() {
    const graphs = await this.listGraphs();
    return graphs.map((data: any) => this.graph(data._key));
  }

  // Queries

  transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string
  ): Promise<any>;
  transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string,
    params?: Object
  ): Promise<any>;
  transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string,
    params?: Object,
    options?: TransactionOptions
  ): Promise<any>;
  transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string,
    lockTimeout?: number
  ): Promise<any>;
  transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string,
    params?: Object,
    lockTimeout?: number
  ): Promise<any>;
  transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string,
    params?: Object | number,
    options?: TransactionOptions | number
  ): Promise<any> {
    if (typeof params === "number") {
      options = params;
      params = undefined;
    }
    if (typeof options === "number") {
      options = { lockTimeout: options };
    }
    if (typeof collections === "string") {
      collections = { write: [collections] };
    } else if (Array.isArray(collections)) {
      collections = { write: collections.map(colToString) };
    } else if (isArangoCollection(collections)) {
      collections = { write: colToString(collections) };
    } else if (collections && typeof collections === "object") {
      collections = { ...collections };
      if (collections.read) {
        if (!Array.isArray(collections.read)) {
          collections.read = colToString(collections.read);
        } else collections.read = collections.read.map(colToString);
      }
      if (collections.write) {
        if (!Array.isArray(collections.write)) {
          collections.write = colToString(collections.write);
        } else collections.write = collections.write.map(colToString);
      }
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/transaction",
        body: {
          collections,
          action,
          params,
          ...options
        }
      },
      res => res.body.result
    );
  }

  query(query: string | AqlQuery | AqlLiteral): Promise<ArrayCursor>;
  query(query: AqlQuery, opts?: any): Promise<ArrayCursor>;
  query(
    query: string | AqlLiteral,
    bindVars?: any,
    opts?: any
  ): Promise<ArrayCursor>;
  query(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: any,
    opts?: any
  ): Promise<ArrayCursor> {
    if (isAqlQuery(query)) {
      opts = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/cursor",
        body: { ...opts, query, bindVars }
      },
      res => new ArrayCursor(this._connection, res.body, res.host)
    );
  }

  // Function management

  listFunctions() {
    return this._connection.request(
      { path: "/_api/aqlfunction" },
      res => res.body
    );
  }

  createFunction(name: string, code: string) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/aqlfunction",
        body: { name, code }
      },
      res => res.body
    );
  }

  dropFunction(name: string, group: boolean = false) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/aqlfunction/${name}`,
        body: { group }
      },
      res => res.body
    );
  }

  // Service management

  listServices() {
    return this._connection.request({ path: "/_api/foxx" }, res => res.body);
  }

  async installService(mount: string, source: any, opts: ServiceOptions = {}) {
    const { configuration, dependencies, ...qs } = opts;
    const req = await toForm({
      configuration,
      dependencies,
      source
    });
    return await this._connection.request(
      {
        ...req,
        method: "POST",
        path: "/_api/foxx",
        isBinary: true,
        qs: { ...qs, mount }
      },
      res => res.body
    );
  }

  async upgradeService(mount: string, source: any, opts: ServiceOptions = {}) {
    const { configuration, dependencies, ...qs } = opts;
    const req = await toForm({
      configuration,
      dependencies,
      source
    });
    return await this._connection.request(
      {
        ...req,
        method: "PATCH",
        path: "/_api/foxx/service",
        isBinary: true,
        qs: { ...qs, mount }
      },
      res => res.body
    );
  }

  async replaceService(mount: string, source: any, opts: ServiceOptions = {}) {
    const { configuration, dependencies, ...qs } = opts;
    const req = await toForm({
      configuration,
      dependencies,
      source
    });
    return await this._connection.request(
      {
        ...req,
        method: "PUT",
        path: "/_api/foxx/service",
        isBinary: true,
        qs: { ...qs, mount }
      },
      res => res.body
    );
  }

  uninstallService(mount: string, opts: any = {}): Promise<void> {
    return this._connection.request(
      {
        method: "DELETE",
        path: "/_api/foxx/service",
        qs: { ...opts, mount }
      },
      () => undefined
    );
  }

  getService(mount: string) {
    return this._connection.request(
      {
        path: "/_api/foxx/service",
        qs: { mount }
      },
      res => res.body
    );
  }

  async getServiceConfiguration(mount: string, minimal: boolean = false) {
    const result = await this._connection.request(
      {
        path: "/_api/foxx/configuration",
        qs: { mount, minimal }
      },
      res => res.body
    );
    if (
      !minimal ||
      !Object.keys(result).every((key: string) => result[key].title)
    )
      return result;
    const values: any = {};
    for (const key of Object.keys(result)) {
      values[key] = result[key].current;
    }
    return values;
  }

  async updateServiceConfiguration(
    mount: string,
    cfg: any,
    minimal: boolean = false
  ) {
    const result = await this._connection.request(
      {
        method: "PATCH",
        path: "/_api/foxx/configuration",
        body: cfg,
        qs: { mount, minimal }
      },
      res => res.body
    );
    if (
      minimal ||
      !result.values ||
      !Object.keys(result.values).every(
        (key: string) => result.values[key].title
      )
    ) {
      return result;
    }
    const result2 = await this.getServiceConfiguration(mount, minimal);
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async replaceServiceConfiguration(
    mount: string,
    cfg: any,
    minimal: boolean = false
  ) {
    const result = await this._connection.request(
      {
        method: "PUT",
        path: "/_api/foxx/configuration",
        body: cfg,
        qs: { mount, minimal }
      },
      res => res.body
    );
    if (
      minimal ||
      !result.values ||
      !Object.keys(result.values).every(
        (key: string) => result.values[key].title
      )
    ) {
      return result;
    }
    const result2 = await this.getServiceConfiguration(mount, minimal);
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async getServiceDependencies(mount: string, minimal: boolean = false) {
    const result = await this._connection.request(
      {
        path: "/_api/foxx/dependencies",
        qs: { mount, minimal }
      },
      res => res.body
    );
    if (
      !minimal ||
      !Object.keys(result).every((key: string) => result[key].title)
    )
      return result;
    const values: any = {};
    for (const key of Object.keys(result)) {
      values[key] = result[key].current;
    }
    return values;
  }

  async updateServiceDependencies(
    mount: string,
    cfg: any,
    minimal: boolean = false
  ) {
    const result = await this._connection.request(
      {
        method: "PATCH",
        path: "/_api/foxx/dependencies",
        body: cfg,
        qs: { mount, minimal }
      },
      res => res.body
    );
    if (
      minimal ||
      !result.values ||
      !Object.keys(result.values).every(
        (key: string) => result.values[key].title
      )
    ) {
      return result;
    }
    const result2 = await this.getServiceDependencies(mount, minimal);
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async replaceServiceDependencies(
    mount: string,
    cfg: { [key: string]: string },
    minimal: boolean = false
  ) {
    const result = await this._connection.request(
      {
        method: "PUT",
        path: "/_api/foxx/dependencies",
        body: cfg,
        qs: { mount, minimal }
      },
      res => res.body
    );
    if (
      minimal ||
      !result.values ||
      !Object.keys(result.values).every(
        (key: string) => result.values[key].title
      )
    ) {
      return result;
    }
    const result2 = await this.getServiceDependencies(mount, minimal);
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  enableServiceDevelopmentMode(mount: string) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/foxx/development",
        qs: { mount }
      },
      res => res.body
    );
  }

  disableServiceDevelopmentMode(mount: string) {
    return this._connection.request(
      {
        method: "DELETE",
        path: "/_api/foxx/development",
        qs: { mount }
      },
      res => res.body
    );
  }

  listServiceScripts(mount: string) {
    return this._connection.request(
      {
        path: "/_api/foxx/scripts",
        qs: { mount }
      },
      res => res.body
    );
  }

  runServiceScript(mount: string, name: string, args: any): Promise<any> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/foxx/scripts/${name}`,
        body: args,
        qs: { mount }
      },
      res => res.body
    );
  }

  runServiceTests(mount: string, opts: any): Promise<any> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/foxx/tests",
        qs: {
          ...opts,
          mount
        }
      },
      res => res.body
    );
  }

  getServiceReadme(mount: string): Promise<string | undefined> {
    return this._connection.request(
      {
        path: "/_api/foxx/readme",
        qs: { mount }
      },
      res => res.body
    );
  }

  getServiceDocumentation(mount: string): Promise<any> {
    return this._connection.request(
      {
        path: "/_api/foxx/swagger",
        qs: { mount }
      },
      res => res.body
    );
  }

  downloadService(mount: string): Promise<Buffer | Blob> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/foxx/download",
        qs: { mount },
        expectBinary: true
      },
      res => res.body
    );
  }

  commitLocalServiceState(replace: boolean = false): Promise<void> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/foxx/commit",
        qs: { replace }
      },
      () => undefined
    );
  }

  version(): Promise<any> {
    return this._connection.request(
      {
        method: "GET",
        path: "/_api/version"
      },
      res => res.body
    );
  }

  login(username: string, password: string): Promise<string> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_open/auth",
        body: { username, password }
      },
      res => {
        this.useBearerAuth(res.body.jwt);
        return res.body.jwt;
      }
    );
  }
}
