import { Readable } from "stream";
import { Analyzer, AnalyzerDescription } from "./analyzer";
import { AqlLiteral, AqlQuery, isAqlLiteral, isAqlQuery } from "./aql-query";
import {
  ArangoCollection,
  Collection,
  CollectionType,
  CreateCollectionOptions,
  DocumentCollection,
  EdgeCollection,
  isArangoCollection,
  ListCollectionResult
} from "./collection";
import { Config, Connection } from "./connection";
import { ArrayCursor } from "./cursor";
import { isArangoError } from "./error";
import { EdgeDefinition, Graph, GraphCreateOptions } from "./graph";
import { Headers, Route } from "./route";
import { Transaction } from "./transaction";
import { btoa } from "./util/btoa";
import { DATABASE_NOT_FOUND } from "./util/codes";
import { FoxxManifest } from "./util/foxx-manifest";
import { toForm } from "./util/multipart";
import { ArangoResponseMetadata } from "./util/types";
import {
  ArangoSearchView,
  ArangoSearchViewPropertiesOptions,
  View,
  ViewDescription,
  ViewType
} from "./view";

function colToString(collection: string | ArangoCollection): string {
  if (isArangoCollection(collection)) {
    return String(collection.name);
  } else return String(collection);
}

export type TransactionCollectionsObject = {
  allowImplicit?: boolean;
  exclusive?: string | string[];
  write?: string | string[];
  read?: string | string[];
};

export type TransactionCollections =
  | string
  | ArangoCollection
  | (string | ArangoCollection)[]
  | {
      allowImplicit?: boolean;
      exclusive?: string | ArangoCollection | (string | ArangoCollection)[];
      write?: string | ArangoCollection | (string | ArangoCollection)[];
      read?: string | ArangoCollection | (string | ArangoCollection)[];
    };

export type TransactionOptions = {
  allowImplicit?: boolean;
  lockTimeout?: number;
  maxTransactionSize?: number;
  /** @deprecated removed in ArangoDB 3.4, RocksDB only */
  intermediateCommitCount?: number;
  /** @deprecated removed in ArangoDB 3.4, RocksDB only */
  intermediateCommitSize?: number;
  waitForSync?: boolean;
};

export type InstallServiceOptions = {
  configuration?: ServiceConfigurationValues;
  dependencies?: { [key: string]: string };
  development?: boolean;
  setup?: boolean;
  legacy?: boolean;
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
    /** RocksDB only */
    intermediateCommitCount?: number;
    satteliteSyncWait?: number;
    fullCount?: boolean;
    /** RocksDB only */
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
  nodes: {
    [key: string]: any;
    type: string;
    id: number;
    dependencies: number[];
    estimatedCost: number;
    estimatedNrItems: number;
  }[];
  rules: string[];
  collections: {
    name: string;
    type: "read" | "write";
  }[];
  variables: {
    id: number;
    name: string;
  }[];
  estimatedCost: number;
  estimatedNrItems: number;
  initialize: boolean;
  isModificationQuery: boolean;
};

export type ExplainResult = {
  plan?: ExplainPlan;
  plans?: ExplainPlan[];
  cacheable: boolean;
  warnings: { code: number; message: string }[];
  stats: {
    rulesExecuted: number;
    rulesSkipped: number;
    plansCreated: number;
  };
};

export type AstNode = {
  [key: string]: any;
  type: string;
  subNodes: AstNode[];
};

export type ParseResult = {
  parsed: boolean;
  collections: string[];
  bindVars: string[];
  ast: AstNode[];
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

export type QueryInfo = {
  id: string;
  query: string;
  bindVars: AqlQuery["bindVars"];
  runTime: number;
  started: string;
  state: "executing" | "finished" | "killed";
  stream: boolean;
};

export type CreateDatabaseUser = {
  username: string;
  passwd?: string;
  active?: boolean;
  extra?: { [key: string]: any };
};

export type Service = {
  mount: string;
  name?: string;
  version?: string;
  provides: { [key: string]: string };
  development: boolean;
  legacy: boolean;
};

type VersionInfo = {
  server: string;
  license: "community" | "enterprise";
  version: string;
};

type AqlFunction = {
  name: string;
  code: string;
  isDeterministic: boolean;
};

type ReplaceServiceOptions = {
  configuration?: ServiceConfigurationValues;
  dependencies?: ServiceDependenciesValues;
  teardown?: boolean;
  setup?: boolean;
  legacy?: boolean;
  force?: boolean;
};

type UninstallServiceOptions = {
  teardown?: boolean;
  force?: boolean;
};

type ServiceInfo = {
  mount: string;
  path: string;
  name?: string;
  version?: string;
  development: boolean;
  legacy: boolean;
  manifest: FoxxManifest;
  checksum: string;
  options: {
    configuration: ServiceConfigurationValues;
    dependencies: ServiceDependenciesValues;
  };
};

type ServiceConfiguration = {
  type:
    | "integer"
    | "boolean"
    | "string"
    | "number"
    | "json"
    | "password"
    | "int"
    | "bool";
  currentRaw: any;
  current: any;
  title: string;
  description?: string;
  required: boolean;
  default?: any;
};

type ServiceDependency =
  | {
      multiple: false;
      current?: string;
      title: string;
      name: string;
      version: string;
      description?: string;
      required: boolean;
    }
  | {
      multiple: true;
      current?: string[];
      title: string;
      name: string;
      version: string;
      description?: string;
      required: boolean;
    };

type ServiceConfigurationValues = {
  [key: string]: any;
};

type ServiceDependenciesValues = {
  [key: string]: string;
};

type ServiceScripts = {
  [key: string]: string;
};

type ServiceTestStats = {
  tests: number;
  passes: number;
  failures: number;
  pending: number;
  duration: number;
};

type ServiceTestStreamTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

type ServiceTestStreamReport = (
  | ["start", { total: number }]
  | ["pass", ServiceTestStreamTest]
  | ["fail", ServiceTestStreamTest]
  | ["end", ServiceTestStats])[];

type ServiceTestSuiteTest = {
  result: "pending" | "pass" | "fail";
  title: string;
  duration: number;
  err?: any;
};

type ServiceTestSuite = {
  title: string;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

type ServiceTestSuiteReport = {
  stats: ServiceTestStats;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

type ServiceTestXunitTest =
  | ["testcase", { classname: string; name: string; time: number }]
  | [
      "testcase",
      { classname: string; name: string; time: number },
      ["failure", { message: string; type: string }, string]
    ];

type ServiceTestXunitReport = [
  "testsuite",
  {
    timestamp: number;
    tests: number;
    errors: number;
    failures: number;
    skip: number;
    time: number;
  },
  ...(ServiceTestXunitTest[])
];

type ServiceTestTapReport = string[];

type ServiceTestDefaultTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

type ServiceTestDefaultReport = {
  stats: ServiceTestStats;
  tests: ServiceTestDefaultTest[];
  pending: ServiceTestDefaultTest[];
  failures: ServiceTestDefaultTest[];
  passes: ServiceTestDefaultTest[];
};

type DatabaseInfo = {
  name: string;
  id: string;
  path: string;
  isSystem: boolean;
};

type SwaggerJson = {
  info: {
    title: string;
    description: string;
    version: string;
    license: string;
  };
  path: {
    [key: string]: any;
  };
  [key: string]: any;
};

export class Database {
  private _connection: Connection;

  constructor(config?: Config) {
    this._connection = new Connection(config);
  }

  get name(): string {
    return this._connection.getDatabaseName();
  }

  //#region misc
  version(): Promise<VersionInfo> {
    return this._connection.request(
      {
        method: "GET",
        path: "/_api/version"
      },
      res => res.body
    );
  }

  route(path?: string, headers?: Headers): Route {
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
  useDatabase(databaseName: string): this {
    this._connection.setDatabaseName(databaseName);
    return this;
  }

  useBasicAuth(username: string = "root", password: string = ""): this {
    this._connection.setHeader(
      "authorization",
      `Basic ${btoa(`${username}:${password}`)}`
    );
    return this;
  }

  useBearerAuth(token: string): this {
    this._connection.setHeader("authorization", `Bearer ${token}`);
    return this;
  }

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
  //#endregion

  //#region databases
  get(): Promise<DatabaseInfo> {
    return this._connection.request(
      { path: "/_api/database/current" },
      res => res.body.result
    );
  }

  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === DATABASE_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  createDatabase(
    databaseName: string,
    users?: CreateDatabaseUser[]
  ): Promise<boolean> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/database",
        body: { users, name: databaseName }
      },
      res => res.body.result
    );
  }

  listDatabases(): Promise<string[]> {
    return this._connection.request(
      { path: "/_api/database" },
      res => res.body.result
    );
  }

  listUserDatabases(): Promise<string[]> {
    return this._connection.request(
      { path: "/_api/database/user" },
      res => res.body.result
    );
  }

  dropDatabase(databaseName: string): Promise<boolean> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/database/${databaseName}`
      },
      res => res.body.result
    );
  }
  //#endregion

  //#region collections
  collection<T extends object = any>(
    collectionName: string
  ): DocumentCollection<T> & EdgeCollection<T> {
    return new Collection(this._connection, collectionName);
  }

  async createCollection<T extends object = any>(
    collectionName: string,
    options: CreateCollectionOptions & {
      type: CollectionType.EDGE_COLLECTION;
    }
  ): Promise<EdgeCollection<T>>;
  async createCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions & {
      type?: CollectionType.DOCUMENT_COLLECTION;
    }
  ): Promise<DocumentCollection<T>>;
  async createCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions & { type?: CollectionType }
  ): Promise<DocumentCollection<T> & EdgeCollection<T>> {
    const collection = new Collection(this._connection, collectionName);
    await collection.create(options);
    return collection;
  }

  async createEdgeCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions
  ): Promise<EdgeCollection<T>> {
    return this.createCollection(collectionName, {
      ...options,
      type: CollectionType.EDGE_COLLECTION
    });
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
  ): Promise<Array<DocumentCollection & EdgeCollection>> {
    const collections = await this.listCollections(excludeSystem);
    return collections.map(data => new Collection(this._connection, data.name));
  }
  //#endregion

  //#region graphs
  graph(graphName: string): Graph {
    return new Graph(this._connection, graphName);
  }

  async createGraph(
    graphName: string,
    edgeDefinitions: EdgeDefinition[],
    options?: GraphCreateOptions
  ): Promise<Graph> {
    const graph = new Graph(this._connection, graphName);
    await graph.create(edgeDefinitions, options);
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

  //#region views
  view(viewName: string): ArangoSearchView {
    return new View(this._connection, viewName);
  }

  async createArangoSearchView(
    viewName: string,
    properties?: ArangoSearchViewPropertiesOptions
  ): Promise<ArangoSearchView> {
    const view = new View(this._connection, viewName);
    await view.create({ ...properties, type: ViewType.ARANGOSEARCH_VIEW });
    return view;
  }

  listViews(): Promise<ViewDescription[]> {
    return this._connection.request(
      { path: "/_api/view" },
      res => res.body.result
    );
  }

  async views(): Promise<ArangoSearchView[]> {
    const views = await this.listViews();
    return views.map(data => new View(this._connection, data.name));
  }
  //#endregion

  //#region analyzers
  analyzer(name: string): Analyzer {
    return new Analyzer(this._connection, name);
  }

  listAnalyzers(): Promise<AnalyzerDescription[]> {
    return this._connection.request(
      { path: "/_api/analyzer" },
      res => res.body.result
    );
  }

  async analyzers(): Promise<Analyzer[]> {
    const analyzers = await this.listAnalyzers();
    return analyzers.map(data => this.analyzer(data.name));
  }
  //#endregion

  //#region transactions
  executeTransaction(
    collections: TransactionCollections,
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

  transaction(transactionId: string): Transaction {
    return new Transaction(this._connection, transactionId);
  }

  beginTransaction(
    collections: TransactionCollections,
    options?: TransactionOptions
  ): Promise<Transaction> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/transaction/begin",
        body: {
          collections: coerceTransactionCollections(collections),
          ...options
        }
      },
      res => new Transaction(this._connection, res.body.result.id)
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

  //#region queries
  query(query: string | AqlQuery | AqlLiteral): Promise<ArrayCursor>;
  query(query: AqlQuery, options?: QueryOptions): Promise<ArrayCursor>;
  query(
    query: string | AqlLiteral,
    bindVars?: AqlQuery["bindVars"],
    options?: QueryOptions
  ): Promise<ArrayCursor>;
  query(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: AqlQuery["bindVars"],
    options?: QueryOptions
  ): Promise<ArrayCursor> {
    if (isAqlQuery(query)) {
      options = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    const { allowDirtyRead = undefined, timeout = undefined, ...extra } =
      options || {};
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

  explain(
    query: string | AqlQuery | AqlLiteral
  ): Promise<ExplainResult & ArangoResponseMetadata>;
  explain(
    query: AqlQuery,
    options?: ExplainOptions
  ): Promise<ExplainResult & ArangoResponseMetadata>;
  explain(
    query: string | AqlLiteral,
    bindVars?: AqlQuery["bindVars"],
    options?: ExplainOptions
  ): Promise<ExplainResult & ArangoResponseMetadata>;
  explain(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: AqlQuery["bindVars"],
    options?: ExplainOptions
  ): Promise<ExplainResult & ArangoResponseMetadata> {
    if (isAqlQuery(query)) {
      options = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/explain",
        body: { options: options, query, bindVars }
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

  setQueryTracking(options?: QueryTrackingOptions): Promise<QueryTracking> {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/query/properties",
        body: options
      },
      res => res.body
    );
  }

  listRunningQueries(): Promise<QueryInfo[]> {
    return this._connection.request(
      {
        method: "GET",
        path: "/_api/query/current"
      },
      res => res.body
    );
  }

  listSlowQueries(): Promise<QueryInfo[]> {
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
  listFunctions(): Promise<AqlFunction[]> {
    return this._connection.request(
      { path: "/_api/aqlfunction" },
      res => res.body.result
    );
  }

  createFunction(
    name: string,
    code: string,
    isDeterministic?: boolean
  ): Promise<ArangoResponseMetadata & { isNewlyCreated: boolean }> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/aqlfunction",
        body: { name, code, isDeterministic }
      },
      res => res.body
    );
  }

  dropFunction(
    name: string,
    group: boolean = false
  ): Promise<ArangoResponseMetadata & { deletedCount: number }> {
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
  listServices(): Promise<Service[]> {
    return this._connection.request({ path: "/_api/foxx" }, res => res.body);
  }

  async installService(
    mount: string,
    source: Readable | Buffer | Blob | string,
    options: InstallServiceOptions = {}
  ): Promise<ServiceInfo> {
    const { configuration, dependencies, ...qs } = options;
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
    source: Readable | Buffer | Blob | string,
    options: ReplaceServiceOptions = {}
  ): Promise<ServiceInfo> {
    const { configuration, dependencies, ...qs } = options;
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
    source: Readable | Buffer | Blob | string,
    options: ReplaceServiceOptions = {}
  ): Promise<ServiceInfo> {
    const { configuration, dependencies, ...qs } = options;
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

  uninstallService(
    mount: string,
    options?: UninstallServiceOptions
  ): Promise<void> {
    return this._connection.request(
      {
        method: "DELETE",
        path: "/_api/foxx/service",
        qs: { ...options, mount }
      },
      () => undefined
    );
  }

  getService(mount: string): Promise<ServiceInfo> {
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
    minimal?: false
  ): Promise<{ [key: string]: ServiceConfiguration }>;
  async getServiceConfiguration(
    mount: string,
    minimal: true
  ): Promise<ServiceConfigurationValues>;
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
    cfg: ServiceConfigurationValues,
    minimal?: false
  ): Promise<{ [key: string]: ServiceConfiguration & { warning?: string } }>;
  async updateServiceConfiguration(
    mount: string,
    cfg: ServiceConfigurationValues,
    minimal: true
  ): Promise<{
    values: ServiceConfigurationValues;
    warnings: { [key: string]: string };
  }>;
  async updateServiceConfiguration(
    mount: string,
    cfg: ServiceConfigurationValues,
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
    const result2 = (await this.getServiceConfiguration(mount, false)) as {
      [key: string]: ServiceConfiguration & { warning?: string };
    };
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async replaceServiceConfiguration(
    mount: string,
    cfg: ServiceConfigurationValues,
    minimal?: false
  ): Promise<{ [key: string]: ServiceConfiguration & { warning?: string } }>;
  async replaceServiceConfiguration(
    mount: string,
    cfg: ServiceConfigurationValues,
    minimal: true
  ): Promise<{
    values: ServiceConfigurationValues;
    warnings: { [key: string]: string };
  }>;
  async replaceServiceConfiguration(
    mount: string,
    cfg: ServiceConfigurationValues,
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
    const result2 = (await this.getServiceConfiguration(mount, false)) as {
      [key: string]: ServiceConfiguration & { warning?: string };
    };
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async getServiceDependencies(
    mount: string,
    minimal?: false
  ): Promise<{ [key: string]: ServiceDependency }>;
  async getServiceDependencies(
    mount: string,
    minimal: true
  ): Promise<ServiceDependenciesValues>;
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
    deps: ServiceDependenciesValues,
    minimal?: false
  ): Promise<{ [key: string]: ServiceDependency & { warning?: string } }>;
  async updateServiceDependencies(
    mount: string,
    deps: ServiceDependenciesValues,
    minimal: true
  ): Promise<{
    values: ServiceDependenciesValues;
    warnings: { [key: string]: string };
  }>;
  async updateServiceDependencies(
    mount: string,
    deps: ServiceDependenciesValues,
    minimal: boolean = false
  ) {
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
    const result2 = (await this.getServiceDependencies(mount, false)) as {
      [key: string]: ServiceDependency & { warning?: string };
    };
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async replaceServiceDependencies(
    mount: string,
    deps: ServiceDependenciesValues,
    minimal?: false
  ): Promise<{ [key: string]: ServiceDependency & { warning?: string } }>;
  async replaceServiceDependencies(
    mount: string,
    deps: ServiceDependenciesValues,
    minimal: true
  ): Promise<{
    values: ServiceDependenciesValues;
    warnings: { [key: string]: string };
  }>;
  async replaceServiceDependencies(
    mount: string,
    deps: ServiceDependenciesValues,
    minimal: boolean = false
  ) {
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
    const result2 = (await this.getServiceDependencies(mount, false)) as {
      [key: string]: ServiceDependency & { warning?: string };
    };
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        (result2[key] as any).warning = result.warnings[key];
      }
    }
    return result2;
  }

  enableServiceDevelopmentMode(mount: string): Promise<ServiceInfo> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/foxx/development",
        qs: { mount }
      },
      res => res.body
    );
  }

  disableServiceDevelopmentMode(mount: string): Promise<ServiceInfo> {
    return this._connection.request(
      {
        method: "DELETE",
        path: "/_api/foxx/development",
        qs: { mount }
      },
      res => res.body
    );
  }

  listServiceScripts(mount: string): Promise<ServiceScripts> {
    return this._connection.request(
      {
        path: "/_api/foxx/scripts",
        qs: { mount }
      },
      res => res.body
    );
  }

  runServiceScript(mount: string, name: string, args?: any): Promise<any> {
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

  runServiceTests(
    mount: string,
    options: {
      reporter: "stream";
      filter?: string;
    }
  ): Promise<ServiceTestStreamReport>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "suite";
      filter?: string;
    }
  ): Promise<ServiceTestSuiteReport>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "xunit";
      filter?: string;
    }
  ): Promise<ServiceTestXunitReport>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "tap";
      filter?: string;
    }
  ): Promise<ServiceTestTapReport>;
  runServiceTests(
    mount: string,
    options?: {
      reporter?: "default";
      filter?: string;
    }
  ): Promise<ServiceTestDefaultReport>;
  runServiceTests(
    mount: string,
    options?: {
      filter?: string;
      reporter?: string;
    }
  ) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/foxx/tests",
        qs: {
          ...options,
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

  getServiceDocumentation(mount: string): Promise<SwaggerJson> {
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
    cols.allowImplicit = collections.allowImplicit;
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
