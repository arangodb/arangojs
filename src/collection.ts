import { ArrayCursor } from "./cursor";
import { Connection } from "./connection";
import { Route } from "./route";

export enum Types {
  DOCUMENT_COLLECTION = 2,
  EDGE_COLLECTION = 3
}

export type DocumentHandle =
  | string
  | {
      _key?: string;
      _id?: string;
    };

export type IndexHandle =
  | string
  | {
      id?: string;
    };

export function isArangoCollection(
  collection: any
): collection is ArangoCollection {
  return Boolean(collection && collection.isArangoCollection);
}

export interface ArangoCollection {
  isArangoCollection: true;
  name: string;
}

export abstract class BaseCollection implements ArangoCollection {
  isArangoCollection: true = true;
  name: string;
  abstract type: number;
  protected _urlPrefix: string;
  protected _idPrefix: string;
  protected _connection: Connection;
  protected _api: Route;

  constructor(connection: Connection, name: string) {
    this.name = name;
    this._urlPrefix = `/collection/${this.name}/`;
    this._idPrefix = `${this.name}/`;
    this._connection = connection;
    this._api = this._connection.route("/_api");
    if (this._connection.arangoMajor >= 3) {
      this.first = undefined!;
      this.last = undefined!;
      this.createCapConstraint = undefined!;
    }
  }

  protected abstract _documentPath(documentHandle: DocumentHandle): string;

  protected _documentHandle(documentHandle: DocumentHandle) {
    if (typeof documentHandle !== "string") {
      if (documentHandle._id) {
        return documentHandle._id;
      }
      if (documentHandle._key) {
        return this._idPrefix + documentHandle._key;
      }
      throw new Error("Document handle must be a document or string");
    }
    if (documentHandle.indexOf("/") === -1) {
      return this._idPrefix + documentHandle;
    }
    return documentHandle;
  }

  protected _indexHandle(indexHandle: IndexHandle) {
    if (typeof indexHandle !== "string") {
      if (indexHandle.id) {
        return indexHandle.id;
      }
      throw new Error("Index handle must be a index or string");
    }
    if (indexHandle.indexOf("/") === -1) {
      return this._idPrefix + indexHandle;
    }
    return indexHandle;
  }

  protected async _get(path: string, qs?: any) {
    const res = await this._api.get(this._urlPrefix + path, qs);
    return res.body;
  }

  protected async _put(path: string, body: any) {
    const res = await this._api.put(this._urlPrefix + path, body);
    return res.body;
  }

  async get() {
    const res = await this._api.get(`/collection/${this.name}`);
    return res.body;
  }

  async create(properties?: any) {
    const res = await this._api.post("/collection", {
      ...properties,
      name: this.name,
      type: this.type
    });
    return res.body;
  }

  properties() {
    return this._get("properties");
  }

  count() {
    return this._get("count");
  }

  figures() {
    return this._get("figures");
  }

  revision() {
    return this._get("revision");
  }

  checksum(opts?: any) {
    return this._get("checksum", opts);
  }

  load(count?: boolean) {
    return this._put(
      "load",
      typeof count === "boolean" ? { count: count } : undefined
    );
  }

  unload() {
    return this._put("unload", undefined);
  }

  setProperties(properties: any) {
    return this._put("properties", properties);
  }

  async rename(name: string) {
    const res = await this._api.put(this._urlPrefix + "rename", { name });
    this.name = name;
    this._idPrefix = `${name}/`;
    this._urlPrefix = `/collection/${name}/`;
    return res.body;
  }

  rotate() {
    return this._put("rotate", undefined);
  }

  truncate() {
    return this._put("truncate", undefined);
  }

  async drop(opts?: any) {
    const res = await this._api.delete(`/collection/${this.name}`, opts);
    return res.body;
  }

  async replace(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev && this._connection.arangoMajor >= 3) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._api.put(
      this._documentPath(documentHandle),
      newValue,
      opts,
      headers
    );
    return res.body;
  }

  async update(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev && this._connection.arangoMajor >= 3) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._api.patch(
      this._documentPath(documentHandle),
      newValue,
      opts,
      headers
    );
    return res.body;
  }

  async bulkUpdate(newValues: any, opts?: any) {
    const res = await this._api.patch(
      `/document/${this.name}`,
      newValues,
      opts
    );
    return res.body;
  }

  async remove(documentHandle: DocumentHandle, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev && this._connection.arangoMajor >= 3) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._api.delete(
      this._documentPath(documentHandle),
      opts,
      headers
    );
    return res.body;
  }

  async list(type: string = "id") {
    if (this._connection.arangoMajor <= 2) {
      const res = await this._api.get("/document", {
        type,
        collection: this.name
      });
      return res.body.documents;
    }

    const res = await this._api.put("/simple/all-keys", {
      type,
      collection: this.name
    });
    return res.body.result;
  }

  async all(opts?: any) {
    const res = await this._api.put("/simple/all", {
      ...opts,
      collection: this.name
    });
    return new ArrayCursor(this._connection, res.body, res.host);
  }

  async any() {
    const res = await this._api.put("/simple/any", { collection: this.name });
    return res.body.document;
  }

  async first(opts?: any) {
    if (typeof opts === "number") {
      opts = { count: opts };
    }
    const res = await this._api.put("/simple/first", {
      ...opts,
      collection: this.name
    });
    return res.body.result;
  }

  async last(opts?: any) {
    if (typeof opts === "number") {
      opts = { count: opts };
    }
    const res = await this._api.put("/simple/last", {
      ...opts,
      collection: this.name
    });
    return res.body.result;
  }

  async byExample(example: any, opts?: any) {
    const res = await this._api.put("/simple/by-example", {
      ...opts,
      example,
      collection: this.name
    });
    return new ArrayCursor(this._connection, res.body, res.host);
  }

  async firstExample(example: any) {
    const res = await this._api.put("/simple/first-example", {
      example,
      collection: this.name
    });
    return res.body.document;
  }

  async removeByExample(example: any, opts?: any) {
    const res = await this._api.put("/simple/remove-by-example", {
      ...opts,
      example,
      collection: this.name
    });
    return res.body;
  }

  async replaceByExample(example: any, newValue: any, opts?: any) {
    const res = await this._api.put("/simple/replace-by-example", {
      ...opts,
      example,
      newValue,
      collection: this.name
    });
    return res.body;
  }

  async updateByExample(example: any, newValue: any, opts?: any) {
    const res = await this._api.put("/simple/update-by-example", {
      ...opts,
      example,
      newValue,
      collection: this.name
    });
    return res.body;
  }

  async lookupByKeys(keys: string[]) {
    const res = await this._api.put("/simple/lookup-by-keys", {
      keys,
      collection: this.name
    });
    return res.body.documents;
  }

  async removeByKeys(keys: string[], options: any) {
    const res = await this._api.put("/simple/remove-by-keys", {
      options,
      keys,
      collection: this.name
    });
    return res.body;
  }

  async import(data: any, opts?: any) {
    const res = await this._api.request({
      method: "POST",
      path: "/import",
      body: data,
      isJsonStream: Boolean(!opts || opts.type !== "array"),
      qs: { type: "auto", ...opts, collection: this.name }
    });
    return res.body;
  }

  async indexes() {
    const res = await this._api.get("/index", { collection: this.name });
    return res.body.indexes;
  }

  async index(indexHandle: IndexHandle) {
    const res = await this._api.get(`/index/${this._indexHandle(indexHandle)}`);
    return res.body;
  }

  async createIndex(details: any) {
    const res = await this._api.post("/index", details, {
      collection: this.name
    });
    return res.body;
  }

  async dropIndex(indexHandle: IndexHandle) {
    const res = await this._api.delete(
      `/index/${this._indexHandle(indexHandle)}`
    );
    return res.body;
  }

  async createCapConstraint(opts?: any) {
    if (typeof opts === "number") {
      opts = { size: opts };
    }
    const res = await this._api.post(
      "/index",
      { ...opts, type: "cap" },
      { collection: this.name }
    );
    return res.body;
  }

  async createHashIndex(fields: string[] | string, opts?: any) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    const res = await this._api.post(
      "/index",
      { unique: false, ...opts, type: "hash", fields: fields },
      { collection: this.name }
    );
    return res.body;
  }

  async createSkipList(fields: string[] | string, opts?: any) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    const res = await this._api.post(
      "/index",
      { unique: false, ...opts, type: "skiplist", fields: fields },
      { collection: this.name }
    );
    return res.body;
  }

  async createPersistentIndex(fields: string[] | string, opts?: any) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    const res = await this._api.post(
      "/index",
      { unique: false, ...opts, type: "persistent", fields: fields },
      { collection: this.name }
    );
    return res.body;
  }

  async createGeoIndex(fields: string[] | string, opts?: any) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    const res = await this._api.post(
      "/index",
      { ...opts, fields, type: "geo" },
      { collection: this.name }
    );
    return res.body;
  }

  async createFulltextIndex(fields: string[] | string, minLength?: number) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    const res = await this._api.post(
      "/index",
      { fields, minLength, type: "fulltext" },
      { collection: this.name }
    );
    return res.body;
  }

  async fulltext(attribute: any, query: any, opts: any = {}) {
    if (opts.index) opts.index = this._indexHandle(opts.index);
    const res = await this._api.put("/simple/fulltext", {
      ...opts,
      attribute,
      query,
      collection: this.name
    });
    return new ArrayCursor(this._connection, res.body, res.host);
  }
}

export class DocumentCollection extends BaseCollection {
  type = Types.DOCUMENT_COLLECTION;
  constructor(connection: Connection, name: string) {
    super(connection, name);
  }

  protected _documentPath(documentHandle: DocumentHandle) {
    return `/document/${this._documentHandle(documentHandle)}`;
  }

  async document(documentHandle: DocumentHandle) {
    const res = await this._api.get(this._documentPath(documentHandle));
    return res.body;
  }

  async save(data: any, opts?: any) {
    if (typeof opts === "boolean") {
      opts = { returnNew: opts };
    }

    if (this._connection.arangoMajor <= 2) {
      const res = await this._api.post(`/document`, data, {
        ...opts,
        collection: this.name
      });
      return res.body;
    }

    const res = await this._api.post(`/document/${this.name}`, data, opts);
    return res.body;
  }
}

export class EdgeCollection extends BaseCollection {
  type = Types.EDGE_COLLECTION;

  constructor(connection: Connection, name: string) {
    super(connection, name);
  }

  protected _documentPath(documentHandle: DocumentHandle) {
    if (this._connection.arangoMajor < 3) {
      return `edge/${this._documentHandle(documentHandle)}`;
    }
    return `document/${this._documentHandle(documentHandle)}`;
  }

  async edge(documentHandle: DocumentHandle) {
    const res = await this._api.get(this._documentPath(documentHandle));
    return res.body;
  }

  async save(data: any): Promise<any>;
  async save(
    data: any,
    fromId: DocumentHandle,
    toId: DocumentHandle
  ): Promise<any>;
  async save(data: any, fromId?: DocumentHandle, toId?: DocumentHandle) {
    if (fromId !== undefined) {
      data._from = this._documentHandle(fromId);
      data._to = this._documentHandle(toId!);
    }
    if (this._connection.arangoMajor <= 2) {
      const res = await this._api.post("/edge", data, {
        collection: this.name,
        from: data._from,
        to: data._to
      });
      return res.body;
    }

    const res = await this._api.post("/document", data, {
      collection: this.name
    });
    return res.body;
  }

  protected async _edges(documentHandle: DocumentHandle, direction: any) {
    const res = await this._api.get(`/edges/${this.name}`, {
      direction,
      vertex: this._documentHandle(documentHandle)
    });
    return res.body.edges;
  }

  edges(vertex: DocumentHandle) {
    return this._edges(vertex, undefined);
  }

  inEdges(vertex: DocumentHandle) {
    return this._edges(vertex, "in");
  }

  outEdges(vertex: DocumentHandle) {
    return this._edges(vertex, "out");
  }

  async traversal(startVertex: DocumentHandle, opts?: any) {
    const res = await this._api.post("/traversal", {
      ...opts,
      startVertex,
      edgeCollection: this.name
    });
    return res.body.result;
  }
}

export function constructCollection(connection: Connection, data: any) {
  const Collection =
    data.type === Types.EDGE_COLLECTION ? EdgeCollection : DocumentCollection;
  return new Collection(connection, data.name);
}
