import { AnalyzerDescription, ArangoAnalyzer } from "./analyzer";
import { AqlLiteral, AqlQuery, isAqlLiteral, isAqlQuery } from "./aql-query";
import {
  ArangoCollection,
  CollectionType,
  CreateCollectionOptions,
  DocumentCollection,
  EdgeCollection,
  isArangoCollection,
  _constructCollection,
  ListCollectionResult
} from "./collection";
import { Config, Connection } from "./connection";
import { ArrayCursor } from "./cursor";
import { isArangoError } from "./error";
import { Graph } from "./graph";
import { Route } from "./route";
import { ArangoTransaction } from "./transaction";
import { btoa } from "./util/btoa";
import { DATABASE_NOT_FOUND } from "./util/codes";
import { toForm } from "./util/multipart";
import { ArangoSearchView, ArangoView, ViewType, _constructView } from "./view";

type TODO_any = any;

function colToString(collection: string | ArangoCollection): string {
  if (isArangoCollection(collection)) {
    return String(collection.name);
  } else return String(collection);
}

export type TransactionCollectionsObject = {
  exclusive?: string | string[];
  write?: string | string[];
  read?: string | string[];
};

export type TransactionCollections =
  | string
  | ArangoCollection
  | (string | ArangoCollection)[]
  | {
      exclusive?: string | ArangoCollection | (string | ArangoCollection)[];
      write?: string | ArangoCollection | (string | ArangoCollection)[];
      read?: string | ArangoCollection | (string | ArangoCollection)[];
    };

export type TransactionOptions = {
  allowImplicit?: boolean;
  lockTimeout?: number;
  maxTransactionSize?: number;
  /** @deprecated removed in ArangoDB 3.4, RocksDB-only */
  intermediateCommitCount?: number;
  /** @deprecated removed in ArangoDB 3.4, RocksDB-only */
  intermediateCommitSize?: number;
  waitForSync?: boolean;
};

export type ServiceOptions = {
  [key: string]: any;
  configuration: { [key: string]: any };
  dependencies: { [key: string]: string };
};

export type QueryOptions = {
  allowDirtyRead?: boolean;
  count?: boolean;
  batchSize?: number;
  cache?: boolean;
  memoryLimit?: number;
  maxRuntime?: number;
  ttl?: number;
  timeout?: number;
  options?: {
    failOnWarning?: boolean;
    profile?: boolean;
    maxTransactionSize?: number;
    stream?: boolean;
    skipInaccessibleCollections?: boolean;
    maxWarningsCount?: number;
    /** RocksDB-only */
    intermediateCommitCount?: number;
    satteliteSyncWait?: number;
    fullCount?: boolean;
    /** RocksDB-only */
    intermediateCommitSize?: number;
    optimizer?: { rules?: string[] };
    maxPlans?: number;
  };
};

export type ExplainOptions = {
  optimizer?: { rules?: string[] };
  maxNumberOfPlans?: number;
  allPlans?: boolean;
};

export type TransactionDetails = {
  id: string;
  state: "running" | "committed" | "aborted";
};

export type ExplainPlan = {
  nodes: any[];
  rules: any[];
  collections: any[];
  variables: any[];
  estimatedCost: number;
  estimatedNrItems: number;
  initialize: boolean;
  isModificationQuery: boolean;
};

export type ExplainResult = {
  plan?: ExplainPlan;
  plans?: Array<ExplainPlan>;
  cacheable: boolean;
  warnings: TODO_any[];
  stats: {
    rulesExecuted: number;
    rulesSkipped: number;
    plansCreated: number;
  };
};

export type ParseResult = {
  parsed: boolean;
  collections: TODO_any[];
  bindVars: TODO_any[];
  ast: TODO_any[];
};

export type QueryTracking = {
  enabled: boolean;
  maxQueryStringLength: number;
  maxSlowQueries: number;
  slowQueryThreshold: number;
  trackBindVars: boolean;
  trackSlowQueries: boolean;
};

export type QueryTrackingOptions = {
  enabled?: boolean;
  maxQueryStringLength?: number;
  maxSlowQueries?: number;
  slowQueryThreshold?: number;
  trackBindVars?: boolean;
  trackSlowQueries?: boolean;
};

export type RunningQuery = {
  id: string;
  query: string;
  bindVars: AqlQuery["bindVars"];
  runTime: number;
  started: string;
  state: string; // TODO determine valid states: executing, finished, ...?
  stream: boolean;
};

export interface ViewDescription {
  id: string;
  name: string;
  type: ViewType;
}

export interface CreateDatabaseUser {
  username: string;
  passwd?: string;
  active?: boolean;
  extra?: { [key: string]: any };
}

export class Database {
  private _connection: Connection;

  constructor(config?: Config) {
    this._connection = new Connection(config);
  }

  get name(): string {
    return this._connection.getDatabaseName();
  }

  //#region misc
  version(): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "GET",
        path: "/_api/version"
      },
      res => res.body
    );
  }

  route(path?: string, headers?: TODO_any): Route {
    return new Route(this._connection, path, headers);
  }

  async acquireHostList(): Promise<void> {
    if (!this._connection.getDatabaseName()) {
      throw new Error("Cannot acquire host list with absolute URL");
    }
    const urls: string[] = await this._connection.request(
      { path: "/_api/cluster/endpoints" },
      res => res.body.endpoints.map((endpoint: any) => endpoint.endpoint)
    );
    this._connection.addToHostList(urls);
  }

  close(): void {
    this._connection.close();
  }
  //#endregion

  //#region auth
  login(username: string = "root", password: string = ""): Promise<string> {
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

  useBearerAuth(token: string): this {
    this._connection.setHeader("authorization", `Bearer ${token}`);
    return this;
  }

  useBasicAuth(username: string = "root", password: string = ""): this {
    this._connection.setHeader(
      "authorization",
      `Basic ${btoa(`${username}:${password}`)}`
    );
    return this;
  }
  //#endregion

  //#region databases
  useDatabase(databaseName: string): this {
    this._connection.setDatabaseName(databaseName);
    return this;
  }

  get(): Promise<TODO_any> {
    return this._connection.request(
      { path: "/_api/database/current" },
      res => res.body.result
    );
  }

  exists(): Promise<boolean> {
    return this.get().then(
      () => true,
      err => {
        if (isArangoError(err) && err.errorNum === DATABASE_NOT_FOUND) {
          return false;
        }
        throw err;
      }
    );
  }

  createDatabase(
    databaseName: string,
    users?: CreateDatabaseUser[]
  ): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/database",
        body: { users, name: databaseName }
      },
      res => res.body
    );
  }

  listDatabases(): Promise<TODO_any> {
    return this._connection.request(
      { path: "/_api/database" },
      res => res.body.result
    );
  }

  listUserDatabases(): Promise<TODO_any> {
    return this._connection.request(
      { path: "/_api/database/user" },
      res => res.body.result
    );
  }

  dropDatabase(databaseName: string): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/database/${databaseName}`
      },
      res => res.body
    );
  }
  //#endregion

  //#region collections
  collection<T extends object = any>(
    collectionName: string
  ): DocumentCollection<T> & EdgeCollection<T> {
    return _constructCollection(this._connection, collectionName);
  }

  async createCollection<T extends object = any>(
    collectionName: string,
    properties?: CreateCollectionOptions & { type?: CollectionType }
  ): Promise<DocumentCollection<T> & EdgeCollection<T>> {
    const collection = _constructCollection(this._connection, collectionName);
    await collection.create(properties);
    return collection;
  }

  async createEdgeCollection<T extends object = any>(
    collectionName: string,
    properties?: CreateCollectionOptions
  ): Promise<EdgeCollection<T>> {
    const collection = _constructCollection(this._connection, collectionName);
    await collection.create({
      ...properties,
      type: CollectionType.EDGE_COLLECTION
    });
    return collection;
  }

  listCollections(
    excludeSystem: boolean = true
  ): Promise<ListCollectionResult[]> {
    return this._connection.request(
      {
        path: "/_api/collection",
        qs: { excludeSystem }
      },
      res => res.body.result
    );
  }

  async collections(
    excludeSystem: boolean = true
  ): Promise<Array<DocumentCollection | EdgeCollection>> {
    const collections = await this.listCollections(excludeSystem);
    return collections.map((data: any) =>
      _constructCollection(this._connection, data.name)
    );
  }

  async truncate(excludeSystem: boolean = true): Promise<TODO_any> {
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
  //#endregion

  //#region views
  arangoSearchView(viewName: string): ArangoSearchView {
    return new ArangoSearchView(this._connection, viewName);
  }

  listViews(): Promise<ViewDescription[]> {
    return this._connection.request(
      { path: "/_api/view" },
      res => res.body.result
    );
  }

  async views(): Promise<ArangoView[]> {
    const views = await this.listViews();
    return views.map((data: any) => _constructView(this._connection, data));
  }
  //#endregion

  //#region analyzers
  analyzer(name: string): ArangoAnalyzer {
    return new ArangoAnalyzer(this._connection, name);
  }

  listAnalyzers(): Promise<AnalyzerDescription[]> {
    return this._connection.request(
      { path: "/_api/analyzer" },
      res => res.body.result
    );
  }

  async analyzers(): Promise<ArangoAnalyzer[]> {
    const analyzers = await this.listAnalyzers();
    return analyzers.map(data => this.analyzer(data.name));
  }
  //#endregion

  //#region transactions
  executeTransaction(
    collections:
      | ArangoCollection
      | string
      | (ArangoCollection | string)[]
      | {
          allowImplicit?: boolean;
          exclusive?: ArangoCollection | string | (ArangoCollection | string)[];
          read?: ArangoCollection | string | (ArangoCollection | string)[];
          write?: ArangoCollection | string | (ArangoCollection | string)[];
        },
    action: string,
    options?: TransactionOptions & { params?: any }
  ): Promise<any> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/transaction",
        body: {
          collections: coerceTransactionCollections(collections),
          action,
          ...options
        }
      },
      res => res.body.result
    );
  }

  transaction(transactionId: string): ArangoTransaction {
    return new ArangoTransaction(this._connection, transactionId);
  }

  beginTransaction(
    collections: TransactionCollections,
    options?: TransactionOptions
  ): Promise<ArangoTransaction> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/transaction/begin",
        body: {
          collections: coerceTransactionCollections(collections),
          ...options
        }
      },
      res => new ArangoTransaction(this._connection, res.body.result.id)
    );
  }

  listTransactions(): Promise<TransactionDetails[]> {
    return this._connection.request(
      { path: "/_api/transaction" },
      res => res.body.transactions
    );
  }

  async transactions(): Promise<ArangoTransaction[]> {
    const transactions = await this.listTransactions();
    return transactions.map(data => this.transaction(data.id));
  }
  //#endregion

  //#region graphs
  graph(graphName: string): Graph {
    return new Graph(this._connection, graphName);
  }

  async createGraph(
    graphName: string,
    properties: TODO_any,
    opts?: { waitForSync?: boolean }
  ): Promise<Graph> {
    const graph = new Graph(this._connection, graphName);
    await graph.create(properties, opts);
    return graph;
  }

  listGraphs() {
    return this._connection.request(
      { path: "/_api/gharial" },
      res => res.body.graphs
    );
  }

  async graphs(): Promise<Graph[]> {
    const graphs = await this.listGraphs();
    return graphs.map((data: any) => this.graph(data._key));
  }
  //#endregion

  //#region queries
  query(query: string | AqlQuery | AqlLiteral): Promise<ArrayCursor>;
  query(query: AqlQuery, opts?: QueryOptions): Promise<ArrayCursor>;
  query(
    query: string | AqlLiteral,
    bindVars?: AqlQuery["bindVars"],
    opts?: QueryOptions
  ): Promise<ArrayCursor>;
  query(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: AqlQuery["bindVars"],
    opts?: QueryOptions
  ): Promise<ArrayCursor> {
    if (isAqlQuery(query)) {
      opts = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    const { allowDirtyRead = undefined, timeout = undefined, ...extra } =
      opts || {};
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/cursor",
        body: { ...extra, query, bindVars },
        allowDirtyRead,
        timeout
      },
      res =>
        new ArrayCursor(
          this._connection,
          res.body,
          res.arangojsHostId,
          allowDirtyRead
        )
    );
  }

  explain(query: string | AqlQuery | AqlLiteral): Promise<ExplainResult>;
  explain(query: AqlQuery, opts?: ExplainOptions): Promise<ExplainResult>;
  explain(
    query: string | AqlLiteral,
    bindVars?: AqlQuery["bindVars"],
    opts?: ExplainOptions
  ): Promise<ExplainResult>;
  explain(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: AqlQuery["bindVars"],
    opts?: ExplainOptions
  ): Promise<ExplainResult> {
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
        path: "/_api/explain",
        body: { options: opts, query, bindVars }
      },
      res => res.body
    );
  }

  parse(query: string | AqlQuery | AqlLiteral): Promise<ParseResult>;
  parse(query: AqlQuery): Promise<ParseResult>;
  parse(query: string | AqlLiteral): Promise<ParseResult>;
  parse(query: string | AqlQuery | AqlLiteral): Promise<ParseResult> {
    if (isAqlQuery(query)) {
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/query",
        body: { query }
      },
      res => res.body
    );
  }

  queryTracking(): Promise<QueryTracking> {
    return this._connection.request(
      {
        method: "GET",
        path: "/_api/query/properties"
      },
      res => res.body
    );
  }

  setQueryTracking(opts?: QueryTrackingOptions): Promise<QueryTracking> {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/query/properties",
        body: opts
      },
      res => res.body
    );
  }

  listRunningQueries(): Promise<Array<RunningQuery>> {
    return this._connection.request(
      {
        method: "GET",
        path: "/_api/query/current"
      },
      res => res.body
    );
  }

  listSlowQueries(): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "GET",
        path: "/_api/query/slow"
      },
      res => res.body
    );
  }

  clearSlowQueries(): Promise<void> {
    return this._connection.request(
      {
        method: "DELETE",
        path: "/_api/query/slow"
      },
      () => undefined
    );
  }

  killQuery(queryId: string): Promise<void> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/query/${queryId}`
      },
      () => undefined
    );
  }
  //#endregion

  //#region functions
  listFunctions(): Promise<TODO_any> {
    return this._connection.request(
      { path: "/_api/aqlfunction" },
      res => res.body
    );
  }

  createFunction(name: string, code: string): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/aqlfunction",
        body: { name, code }
      },
      res => res.body
    );
  }

  dropFunction(name: string, group: boolean = false): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/aqlfunction/${name}`,
        body: { group }
      },
      res => res.body
    );
  }
  //#endregion

  //#region services
  listServices(): Promise<TODO_any> {
    return this._connection.request({ path: "/_api/foxx" }, res => res.body);
  }

  async installService(
    mount: string,
    source: TODO_any,
    opts: Partial<ServiceOptions> = {}
  ): Promise<TODO_any> {
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

  async upgradeService(
    mount: string,
    source: TODO_any,
    opts: Partial<ServiceOptions> = {}
  ): Promise<TODO_any> {
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

  async replaceService(
    mount: string,
    source: TODO_any,
    opts: Partial<ServiceOptions> = {}
  ): Promise<TODO_any> {
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

  uninstallService(mount: string, opts?: TODO_any): Promise<void> {
    return this._connection.request(
      {
        method: "DELETE",
        path: "/_api/foxx/service",
        qs: { ...opts, mount }
      },
      () => undefined
    );
  }

  getService(mount: string): Promise<TODO_any> {
    return this._connection.request(
      {
        path: "/_api/foxx/service",
        qs: { mount }
      },
      res => res.body
    );
  }

  async getServiceConfiguration(
    mount: string,
    minimal: boolean = false
  ): Promise<TODO_any> {
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
    cfg: ServiceOptions["configuration"],
    minimal: boolean = false
  ): Promise<TODO_any> {
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
    cfg: ServiceOptions["configuration"],
    minimal: boolean = false
  ): Promise<TODO_any> {
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

  async getServiceDependencies(
    mount: string,
    minimal: boolean = false
  ): Promise<TODO_any> {
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
    deps: ServiceOptions["dependencies"],
    minimal: boolean = false
  ): Promise<TODO_any> {
    const result = await this._connection.request(
      {
        method: "PATCH",
        path: "/_api/foxx/dependencies",
        body: deps,
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
    // Work around "minimal" flag not existing in 3.3
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
    deps: ServiceOptions["dependencies"],
    minimal: boolean = false
  ): Promise<TODO_any> {
    const result = await this._connection.request(
      {
        method: "PUT",
        path: "/_api/foxx/dependencies",
        body: deps,
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
    // Work around "minimal" flag not existing in 3.3
    const result2 = await this.getServiceDependencies(mount, minimal);
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  enableServiceDevelopmentMode(mount: string): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/foxx/development",
        qs: { mount }
      },
      res => res.body
    );
  }

  disableServiceDevelopmentMode(mount: string): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "DELETE",
        path: "/_api/foxx/development",
        qs: { mount }
      },
      res => res.body
    );
  }

  listServiceScripts(mount: string): Promise<TODO_any> {
    return this._connection.request(
      {
        path: "/_api/foxx/scripts",
        qs: { mount }
      },
      res => res.body
    );
  }

  runServiceScript(
    mount: string,
    name: string,
    args: TODO_any
  ): Promise<TODO_any> {
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

  runServiceTests(mount: string, opts?: TODO_any): Promise<TODO_any> {
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

  getServiceDocumentation(mount: string): Promise<TODO_any> {
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
  //#endregion
}

function coerceTransactionCollections(
  collections: TransactionCollections
): TransactionCollectionsObject {
  if (typeof collections === "string") {
    return { write: [collections] };
  }
  if (Array.isArray(collections)) {
    return { write: collections.map(colToString) };
  }
  if (isArangoCollection(collections)) {
    return { write: colToString(collections) };
  }
  const cols: TransactionCollectionsObject = {};
  if (collections) {
    if (collections.read) {
      cols.read = Array.isArray(collections.read)
        ? collections.read.map(colToString)
        : colToString(collections.read);
    }
    if (collections.write) {
      cols.write = Array.isArray(collections.write)
        ? collections.write.map(colToString)
        : colToString(collections.write);
    }
    if (collections.exclusive) {
      cols.exclusive = Array.isArray(collections.exclusive)
        ? collections.exclusive.map(colToString)
        : colToString(collections.exclusive);
    }
  }
  return cols;
}
