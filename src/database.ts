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
  private _api: Route;
  private _connection: Connection;

  constructor(config?: Config) {
    this._connection = new Connection(config);
    this._api = this._connection.route("/_api");
    this.useBasicAuth();
  }

  get name(): string | null {
    return this._connection.getDatabaseName() || null;
  }

  route(path?: string, headers?: Object) {
    return this._connection.route(path, headers);
  }

  async acquireHostList() {
    if (!this._connection.getDatabaseName()) {
      throw new Error("Cannot acquire host list with absolute URL");
    }
    const res = await this._api.request({
      path: "/_api/cluster/endpoints"
    });
    const urls: string[] = res.body.endpoints.map(
      (endpoint: any) => endpoint.endpoint
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

  async get() {
    const res = await this._api.get("/database/current");
    return res.body.result;
  }

  async createDatabase(databaseName: string, users?: string[]) {
    const res = await this._api.post("/database", {
      users,
      name: databaseName
    });
    return res.body;
  }

  async listDatabases() {
    const res = await this._api.get("/database");
    return res.body.result;
  }

  async listUserDatabases() {
    const res = await this._api.get("/database/user");
    return res.body.result;
  }

  async dropDatabase(databaseName: string) {
    const res = await this._api.delete(`/database/${databaseName}`);
    return res.body;
  }

  // Collection manipulation

  collection(collectionName: string) {
    return new DocumentCollection(this._connection, collectionName);
  }

  edgeCollection(collectionName: string) {
    return new EdgeCollection(this._connection, collectionName);
  }

  async listCollections(excludeSystem: boolean = true) {
    const res = await this._api.get("/collection", { excludeSystem });
    if (this._connection.arangoMajor <= 2) {
      return res.body.collections;
    }
    return res.body.result;
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
      collections.map(async (data: any) => {
        const res = await this._api.put(`/collection/${data.name}/truncate`);
        return res.body;
      })
    );
  }

  // Graph manipulation

  graph(graphName: string) {
    return new Graph(this._connection, graphName);
  }

  async listGraphs() {
    const res = await this._api.get("/gharial");
    return res.body.graphs;
  }

  async graphs() {
    const graphs = await this.listGraphs();
    return graphs.map((data: any) => this.graph(data._key));
  }

  // Queries

  async transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string
  ): Promise<any>;
  async transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string,
    params?: any
  ): Promise<any>;
  async transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string,
    params?: any,
    options?: TrOptions
  ): Promise<any>;
  async transaction(
    collections: CollectionName | CollectionName[] | TransactionCollections,
    action: string,
    params?: any,
    options?: TrOptions
  ): Promise<any> {
    if (typeof params === "number") {
      options = { lockTimeout: params };
      params = undefined;
    }
    if (
      typeof params === "object"
      && (params.waitForSync
      || params.lockTimeout
      || params.maxTransactionSize
      || params.intermediateCommitCount
      || params.intermediateCommitSize)
    ) {
      options = params;
      params = undefined;
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
    const res = await this._api.post("/transaction", {
      collections,
      action,
      params,
      ...(options as TransactionOptions)
    });
    return res.body.result;
  }

  async query(query: string | AqlQuery | AqlLiteral): Promise<ArrayCursor>;
  async query(query: AqlQuery, opts?: any): Promise<ArrayCursor>;
  async query(
    query: string | AqlLiteral,
    bindVars?: any,
    opts?: any
  ): Promise<ArrayCursor>;
  async query(
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
    const res = await this._api.post("/cursor", { ...opts, query, bindVars });
    return new ArrayCursor(this._connection, res.body, res.host);
  }

  // Function management

  async listFunctions() {
    const res = await this._api.get("/aqlfunction");
    return res.body;
  }

  async createFunction(name: string, code: string) {
    const res = await this._api.post("/aqlfunction", { name, code });
    return res.body;
  }

  async dropFunction(name: string, group: boolean = false) {
    const res = await this._api.delete(`/aqlfunction/${name}`, { group });
    return res.body;
  }

  // Service management

  async listServices() {
    const res = await this._api.get("/foxx");
    return res.body;
  }

  async installService(mount: string, source: any, opts: ServiceOptions = {}) {
    const { configuration, dependencies, ...qs } = opts;
    const req = await toForm({
      configuration,
      dependencies,
      source
    });
    const res = await this._api.request({
      method: "POST",
      path: "/foxx",
      body: req.body,
      isBinary: true,
      qs: { ...qs, mount },
      headers: req.headers
    });
    return res.body;
  }

  async upgradeService(mount: string, source: any, opts: ServiceOptions = {}) {
    const { configuration, dependencies, ...qs } = opts;
    const req = await toForm({
      configuration,
      dependencies,
      source
    });
    const res = await this._api.request({
      method: "PATCH",
      path: "/foxx/service",
      body: req.body,
      isBinary: true,
      qs: { ...qs, mount },
      headers: req.headers
    });
    return res.body;
  }

  async replaceService(mount: string, source: any, opts: ServiceOptions = {}) {
    const { configuration, dependencies, ...qs } = opts;
    const req = await toForm({
      configuration,
      dependencies,
      source
    });
    const res = await this._api.request({
      method: "PUT",
      path: "/foxx/service",
      body: req.body,
      isBinary: true,
      qs: { ...qs, mount },
      headers: req.headers
    });
    return res.body;
  }

  async uninstallService(mount: string, opts: any = {}): Promise<void> {
    await this._api.delete("/foxx/service", { ...opts, mount });
  }

  async getService(mount: string) {
    const res = await this._api.get("/foxx/service", { mount });
    return res.body;
  }

  async getServiceConfiguration(mount: string, minimal: boolean = false) {
    const res = await this._api.get("/foxx/configuration", { mount, minimal });
    if (!minimal || !Object.values(res.body).every((value: any) => value.title))
      return res.body;
    const values: any = {};
    for (const key of Object.keys(res.body)) {
      values[key] = res.body[key].current;
    }
    return values;
  }

  async updateServiceConfiguration(
    mount: string,
    cfg: any,
    minimal: boolean = false
  ) {
    const res = await this._api.patch("/foxx/configuration", cfg, {
      mount,
      minimal
    });
    const result = res.body;
    if (
      minimal ||
      !result.values ||
      !Object.values(result.values).every((value: any) => value.title)
    ) {
      return result;
    }
    const res2 = await this.getServiceConfiguration(mount, minimal);
    const result2 = res2.body;
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
    const res = await this._api.put("/foxx/configuration", cfg, {
      mount,
      minimal
    });
    const result = res.body;
    if (
      minimal ||
      !result.values ||
      !Object.values(result.values).every((value: any) => value.title)
    ) {
      return result;
    }
    const res2 = await this.getServiceConfiguration(mount, minimal);
    const result2 = res2.body;
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async getServiceDependencies(mount: string, minimal: boolean = false) {
    const res = await this._api.get("/foxx/dependencies", { mount, minimal });
    if (!minimal || !Object.values(res.body).every((value: any) => value.title))
      return res.body;
    const values: any = {};
    for (const key of Object.keys(res.body)) {
      values[key] = res.body[key].current;
    }
    return values;
  }

  async updateServiceDependencies(
    mount: string,
    cfg: any,
    minimal: boolean = false
  ) {
    const res = await this._api.patch("/foxx/dependencies", cfg, {
      mount,
      minimal
    });
    const result = res.body;
    if (
      minimal ||
      !result.values ||
      !Object.values(result.values).every((value: any) => value.title)
    ) {
      return result;
    }
    const res2 = await this.getServiceDependencies(mount, minimal);
    const result2 = res2.body;
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
    const res = await this._api.put("/foxx/dependencies", cfg, {
      mount,
      minimal
    });
    const result = res.body;
    if (
      minimal ||
      !result.values ||
      !Object.values(result.values).every((value: any) => value.title)
    ) {
      return result;
    }
    const res2 = await this.getServiceDependencies(mount, minimal);
    const result2 = res2.body;
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async enableServiceDevelopmentMode(mount: string) {
    const res = await this._api.post("/foxx/development", undefined, { mount });
    return res.body;
  }

  async disableServiceDevelopmentMode(mount: string) {
    const res = await this._api.delete("/foxx/development", { mount });
    return res.body;
  }

  async listServiceScripts(mount: string) {
    const res = await this._api.get("/foxx/scripts", { mount });
    return res.body;
  }

  async runServiceScript(mount: string, name: string, args: any): Promise<any> {
    const res = await this._api.post(`/foxx/scripts/${name}`, args, { mount });
    return res.body;
  }

  async runServiceTests(mount: string, opts: any): Promise<any> {
    const res = await this._api.post("/foxx/tests", undefined, {
      ...opts,
      mount
    });
    return res.body;
  }

  async getServiceReadme(mount: string): Promise<string | undefined> {
    const res = await this._api.get("/foxx/readme", { mount });
    return res.body;
  }

  async getServiceDocumentation(mount: string): Promise<any> {
    const res = await this._api.get("/foxx/swagger", { mount });
    return res.body;
  }

  async downloadService(mount: string): Promise<Buffer | Blob> {
    const res = await this._api.request({
      method: "POST",
      path: "/foxx/download",
      qs: { mount },
      expectBinary: true
    });
    return res.body;
  }

  async commitLocalServiceState(replace: boolean = false): Promise<void> {
    await this._api.post("/foxx/commit", undefined, { replace });
  }
}
