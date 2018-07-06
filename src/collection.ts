import { Connection } from "./connection";
import { ArrayCursor } from "./cursor";

export enum CollectionType {
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

const COLLECTION_NOT_FOUND = 1203;
export abstract class BaseCollection implements ArangoCollection {
  isArangoCollection: true = true;
  name: string;
  abstract type: number;
  protected _urlPrefix: string;
  protected _idPrefix: string;
  protected _connection: Connection;

  constructor(connection: Connection, name: string) {
    this.name = name;
    this._urlPrefix = `/collection/${this.name}/`;
    this._idPrefix = `${this.name}/`;
    this._connection = connection;
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

  protected _get(path: string, qs?: any) {
    return this._connection.request(
      { path: `/_api/${this._urlPrefix}${path}`, qs },
      res => res.body
    );
  }

  protected _put(path: string, body: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/${this._urlPrefix}${path}`,
        body
      },
      res => res.body
    );
  }

  get() {
    return this._connection.request(
      { path: `/_api/collection/${this.name}` },
      res => res.body
    );
  }

  exists(): Promise<boolean> {
    return this.get().then(
      () => true,
      err => {
        if (err.errorNum !== COLLECTION_NOT_FOUND) {
          throw err;
        }
        return false;
      }
    );
  }

  create(properties?: any) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/collection",
        body: {
          ...properties,
          name: this.name,
          type: this.type
        }
      },
      res => res.body
    );
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
    const result = await this._connection.request(
      {
        method: "PUT",
        path: `/_api/${this._urlPrefix}rename`,
        body: { name }
      },
      res => res.body
    );
    this.name = name;
    this._idPrefix = `${name}/`;
    this._urlPrefix = `/collection/${name}/`;
    return result;
  }

  rotate() {
    return this._put("rotate", undefined);
  }

  truncate() {
    return this._put("truncate", undefined);
  }

  drop(opts?: any) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/collection/${this.name}`,
        qs: opts
      },
      res => res.body
    );
  }

  replace(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev && this._connection.arangoMajor >= 3) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/${this._documentPath(documentHandle)}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body
    );
  }

  update(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev && this._connection.arangoMajor >= 3) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/${this._documentPath(documentHandle)}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body
    );
  }

  bulkUpdate(newValues: any, opts?: any) {
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/document/${this.name}`,
        body: newValues,
        qs: opts
      },
      res => res.body
    );
  }

  remove(documentHandle: DocumentHandle, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev && this._connection.arangoMajor >= 3) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/${this._documentPath(documentHandle)}`,
        qs: opts,
        headers
      },
      res => res.body
    );
  }

  list(type: string = "id") {
    if (this._connection.arangoMajor <= 2) {
      return this._connection.request(
        {
          path: "/_api/document",
          qs: { type, collection: this.name }
        },
        res => res.body.documents
      );
    }

    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/all-keys",
        body: { type, collection: this.name }
      },
      res => res.body.result
    );
  }

  all(opts?: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/all",
        body: {
          ...opts,
          collection: this.name
        }
      },
      res => new ArrayCursor(this._connection, res.body, res.host)
    );
  }

  any() {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/any",
        body: { collection: this.name }
      },
      res => res.body.document
    );
  }

  first(opts?: any) {
    if (typeof opts === "number") {
      opts = { count: opts };
    }
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/first",
        body: {
          ...opts,
          collection: this.name
        }
      },
      res => res.body.result
    );
  }

  last(opts?: any) {
    if (typeof opts === "number") {
      opts = { count: opts };
    }
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/last",
        body: {
          ...opts,
          collection: this.name
        }
      },
      res => res.body.result
    );
  }

  byExample(example: any, opts?: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/by-example",
        body: {
          ...opts,
          example,
          collection: this.name
        }
      },
      res => new ArrayCursor(this._connection, res.body, res.host)
    );
  }

  firstExample(example: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/first-example",
        body: {
          example,
          collection: this.name
        }
      },
      res => res.body.document
    );
  }

  removeByExample(example: any, opts?: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/remove-by-example",
        body: {
          ...opts,
          example,
          collection: this.name
        }
      },
      res => res.body
    );
  }

  replaceByExample(example: any, newValue: any, opts?: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/replace-by-example",
        body: {
          ...opts,
          example,
          newValue,
          collection: this.name
        }
      },
      res => res.body
    );
  }

  updateByExample(example: any, newValue: any, opts?: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/update-by-example",
        body: {
          ...opts,
          example,
          newValue,
          collection: this.name
        }
      },
      res => res.body
    );
  }

  lookupByKeys(keys: string[]) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/lookup-by-keys",
        body: {
          keys,
          collection: this.name
        }
      },
      res => res.body.documents
    );
  }

  removeByKeys(keys: string[], options: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/remove-by-keys",
        body: {
          options,
          keys,
          collection: this.name
        }
      },
      res => res.body
    );
  }

  import(data: any, opts?: any) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/import",
        body: data,
        isJsonStream: Boolean(!opts || opts.type !== "array"),
        qs: { type: "auto", ...opts, collection: this.name }
      },
      res => res.body
    );
  }

  indexes() {
    return this._connection.request(
      {
        path: "/_api/index",
        qs: { collection: this.name }
      },
      res => res.body.indexes
    );
  }

  index(indexHandle: IndexHandle) {
    return this._connection.request(
      { path: `/_api/index/${this._indexHandle(indexHandle)}` },
      res => res.body
    );
  }

  createIndex(details: any) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: details,
        qs: { collection: this.name }
      },
      res => res.body
    );
  }

  dropIndex(indexHandle: IndexHandle) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/index/${this._indexHandle(indexHandle)}`
      },
      res => res.body
    );
  }

  createCapConstraint(opts?: any) {
    if (typeof opts === "number") {
      opts = { size: opts };
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { ...opts, type: "cap" },
        qs: { collection: this.name }
      },
      res => res.body
    );
  }

  createHashIndex(fields: string[] | string, opts?: any) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { unique: false, ...opts, type: "hash", fields: fields },
        qs: { collection: this.name }
      },
      res => res.body
    );
  }

  createSkipList(fields: string[] | string, opts?: any) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { unique: false, ...opts, type: "skiplist", fields: fields },
        qs: { collection: this.name }
      },
      res => res.body
    );
  }

  createPersistentIndex(fields: string[] | string, opts?: any) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { unique: false, ...opts, type: "persistent", fields: fields },
        qs: { collection: this.name }
      },
      res => res.body
    );
  }

  createGeoIndex(fields: string[] | string, opts?: any) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { ...opts, fields, type: "geo" },
        qs: { collection: this.name }
      },
      res => res.body
    );
  }

  createFulltextIndex(fields: string[] | string, minLength?: number) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { fields, minLength, type: "fulltext" },
        qs: { collection: this.name }
      },
      res => res.body
    );
  }

  fulltext(attribute: any, query: any, opts: any = {}) {
    if (opts.index) opts.index = this._indexHandle(opts.index);
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/fulltext",
        body: {
          ...opts,
          attribute,
          query,
          collection: this.name
        }
      },
      res => new ArrayCursor(this._connection, res.body, res.host)
    );
  }
}

export interface DocumentSaveOptions {
  waitForSync?: boolean;
  returnNew?: boolean;
  returnOld?: boolean;
  overwrite?: boolean;
  silent?: boolean;
}

export class DocumentCollection extends BaseCollection {
  type = CollectionType.DOCUMENT_COLLECTION;
  constructor(connection: Connection, name: string) {
    super(connection, name);
  }

  protected _documentPath(documentHandle: DocumentHandle) {
    return `/document/${this._documentHandle(documentHandle)}`;
  }

  document(documentHandle: DocumentHandle) {
    return this._connection.request(
      { path: `/_api/${this._documentPath(documentHandle)}` },
      res => res.body
    );
  }

  save(data: any, opts?: DocumentSaveOptions | boolean) {
    if (typeof opts === "boolean") {
      opts = { returnNew: opts };
    }

    if (this._connection.arangoMajor <= 2) {
      return this._connection.request(
        {
          method: "POST",
          path: "/_api/document",
          body: data,
          qs: {
            ...opts,
            collection: this.name
          }
        },
        res => res.body
      );
    }

    return this._connection.request(
      {
        method: "POST",
        path: `/_api/document/${this.name}`,
        body: data,
        qs: opts
      },
      res => res.body
    );
  }
}

export class EdgeCollection extends BaseCollection {
  type = CollectionType.EDGE_COLLECTION;

  constructor(connection: Connection, name: string) {
    super(connection, name);
  }

  protected _documentPath(documentHandle: DocumentHandle) {
    if (this._connection.arangoMajor < 3) {
      return `edge/${this._documentHandle(documentHandle)}`;
    }
    return `document/${this._documentHandle(documentHandle)}`;
  }

  edge(documentHandle: DocumentHandle) {
    return this._connection.request(
      { path: `/_api/${this._documentPath(documentHandle)}` },
      res => res.body
    );
  }

  save(data: any, opts?: DocumentSaveOptions | boolean): Promise<any>;
  save(
    data: any,
    fromId: DocumentHandle,
    toId: DocumentHandle,
    opts?: DocumentSaveOptions | boolean
  ): Promise<any>;
  save(
    data: any,
    fromIdOrOpts?: DocumentHandle | DocumentSaveOptions | boolean,
    toId?: DocumentHandle,
    opts?: DocumentSaveOptions | boolean
  ) {
    if (toId !== undefined) {
      data._from = this._documentHandle(fromIdOrOpts as DocumentHandle);
      data._to = this._documentHandle(toId!);
    } else if (fromIdOrOpts !== undefined) {
      opts = fromIdOrOpts as DocumentSaveOptions | boolean;
    }
    if (typeof opts === "boolean") {
      opts = { returnNew: opts };
    }
    if (this._connection.arangoMajor <= 2) {
      return this._connection.request(
        {
          method: "POST",
          path: "/_api/edge",
          body: data,
          qs: {
            ...opts,
            collection: this.name,
            from: data._from,
            to: data._to
          }
        },
        res => res.body
      );
    }

    return this._connection.request(
      {
        method: "POST",
        path: "/_api/document",
        body: data,
        qs: { collection: this.name }
      },
      res => res.body
    );
  }

  protected _edges(documentHandle: DocumentHandle, direction: any) {
    return this._connection.request(
      {
        path: `/_api/edges/${this.name}`,
        qs: {
          direction,
          vertex: this._documentHandle(documentHandle)
        }
      },
      res => res.body.edges
    );
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

  traversal(startVertex: DocumentHandle, opts?: any) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/traversal",
        body: {
          ...opts,
          startVertex,
          edgeCollection: this.name
        }
      },
      res => res.body.result
    );
  }
}

export function constructCollection(connection: Connection, data: any) {
  const Collection =
    data.type === CollectionType.EDGE_COLLECTION
      ? EdgeCollection
      : DocumentCollection;
  return new Collection(connection, data.name);
}
