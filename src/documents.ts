/**
 * ```ts
 * import type { Document, Edge } from "arangojs/documents";
 * ```
 *
 * The "documents" module provides document/edge related types for TypeScript.
 *
 * @packageDocumentation
 */

//#region Shared types
/**
 * Common ArangoDB metadata properties of a document.
 */
export type DocumentMetadata = {
  /**
   * Key of the document, which uniquely identifies the document within its
   * collection.
   */
  _key: string;
  /**
   * Unique ID of the document, which is composed of the collection name
   * and the document `_key`.
   */
  _id: string;
  /**
   * Revision of the document data.
   */
  _rev: string;
};

/**
 * ArangoDB metadata defining the relations of an edge document.
 */
export type EdgeMetadata = {
  /**
   * Unique ID of the document that acts as the edge's start vertex.
   */
  _from: string;
  /**
   * Unique ID of the document that acts as the edge's end vertex.
   */
  _to: string;
};
//#endregion

//#region Document types
/**
 * Type representing an object that can be stored in a collection.
 */
export type DocumentData<T extends Record<string, any> = any> = T &
  Partial<DocumentMetadata> &
  Partial<EdgeMetadata>;

/**
 * Type representing an object that can be stored in an edge collection.
 */
export type EdgeData<T extends Record<string, any> = any> = T &
  Partial<DocumentMetadata> &
  EdgeMetadata;

/**
 * Type representing a document stored in a collection.
 */
export type Document<T extends Record<string, any> = any> = T &
  DocumentMetadata &
  Partial<EdgeMetadata>;

/**
 * Type representing an edge document stored in an edge collection.
 */
export type Edge<T extends Record<string, any> = any> = T &
  DocumentMetadata &
  EdgeMetadata;

/**
 * Type representing patch data for a given object type to represent a payload
 * ArangoDB can apply in a document PATCH request (i.e. a partial update).
 *
 * This differs from `Partial` in that it also applies itself to any nested
 * objects recursively.
 */
export type Patch<T = Record<string, any>> = {
  [K in keyof T]?: T[K] | Patch<T[K]>;
};
//#endregion

//#region Document operation options
/**
 * Options for checking whether a document exists in a collection.
 */
export type DocumentExistsOptions = {
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
  /**
   * If set to a document revision, the document will only match if its `_rev`
   * matches the given revision.
   */
  ifMatch?: string;
  /**
   * If set to a document revision, the document will only match if its `_rev`
   * does not match the given revision.
   */
  ifNoneMatch?: string;
};

/**
 * Options for retrieving a document from a collection.
 */
export type ReadDocumentOptions = {
  /**
   * If set to `true`, `null` is returned instead of an exception being thrown
   * if the document does not exist.
   */
  graceful?: boolean;
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
  /**
   * If set to a document revision, the request will fail with an error if the
   * document exists but its `_rev` does not match the given revision.
   */
  ifMatch?: string;
  /**
   * If set to a document revision, the request will fail with an error if the
   * document exists and its `_rev` matches the given revision. Note that an
   * `HttpError` with code 304 will be thrown instead of an `ArangoError`.
   */
  ifNoneMatch?: string;
};

/**
 * Options for retrieving multiple documents from a collection.
 */
export type BulkReadDocumentsOptions = {
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
  /**
   * If set to `false`, the existing document will only be modified if its
   * `_rev` property matches the same property on the new data.
   *
   * Default: `true`
   */
  ignoreRevs?: boolean;
};

/**
 * Options for inserting a new document into a collection.
 */
export type InsertDocumentOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, no data will be returned by the server. This option can
   * be used to reduce network traffic.
   *
   * Default: `false`
   */
  silent?: boolean;
  /**
   * If set to `true`, the complete new document will be returned as the `new`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnNew?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object. Has no effect if `silent` is set to `true`.
   * This option is only available when `overwriteMode` is set to `"update"` or
   * `"replace"`.
   *
   * Default: `false`
   */
  returnOld?: boolean;
  /**
   * Defines what should happen if a document with the same `_key` or `_id`
   * already exists, instead of throwing an exception.
   *
   * Default: `"conflict"
   */
  overwriteMode?: "ignore" | "update" | "replace" | "conflict";
  /**
   * If set to `false`, properties with a value of `null` will be removed from
   * the new document.
   *
   * Default: `true`
   */
  keepNull?: boolean;
  /**
   * If set to `false`, object properties that already exist in the old
   * document will be overwritten rather than merged when an existing document
   * with the same `_key` or `_id` is updated. This does not affect arrays.
   *
   * Default: `true`
   */
  mergeObjects?: boolean;
  /**
   * If set to `true`, new entries will be added to in-memory index caches if
   * document insertions affect the edge index or cache-enabled persistent
   * indexes.
   *
   * Default: `false`
   */
  refillIndexCaches?: boolean;
  /**
   * If set, the attribute with the name specified by the option is looked up
   * in the stored document and the attribute value is compared numerically to
   * the value of the versioning attribute in the supplied document that is
   * supposed to update/replace it.
   */
  versionAttribute?: string;
};

/**
 * Options for replacing an existing document in a collection.
 */
export type ReplaceDocumentOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, no data will be returned by the server. This option can
   * be used to reduce network traffic.
   *
   * Default: `false`
   */
  silent?: boolean;
  /**
   * If set to `true`, the complete new document will be returned as the `new`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnNew?: boolean;
  /**
   * If set to `false`, the existing document will only be modified if its
   * `_rev` property matches the same property on the new data.
   *
   * Default: `true`
   */
  ignoreRevs?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnOld?: boolean;
  /**
   * If set to a document revision, the document will only be replaced if its
   * `_rev` matches the given revision.
   */
  ifMatch?: string;
  /**
   * If set to `true`, existing entries in in-memory index caches will be
   * updated if document replacements affect the edge index or cache-enabled
   * persistent indexes.
   *
   * Default: `false`
   */
  refillIndexCaches?: boolean;
  /**
   * If set, the attribute with the name specified by the option is looked up
   * in the stored document and the attribute value is compared numerically to
   * the value of the versioning attribute in the supplied document that is
   * supposed to update/replace it.
   */
  versionAttribute?: string;
};

/**
 * Options for updating a document in a collection.
 */
export type UpdateDocumentOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, no data will be returned by the server. This option can
   * be used to reduce network traffic.
   *
   * Default: `false`
   */
  silent?: boolean;
  /**
   * If set to `true`, the complete new document will be returned as the `new`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnNew?: boolean;
  /**
   * If set to `false`, the existing document will only be modified if its
   * `_rev` property matches the same property on the new data.
   *
   * Default: `true`
   */
  ignoreRevs?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnOld?: boolean;
  /**
   * If set to `false`, properties with a value of `null` will be removed from
   * the new document.
   *
   * Default: `true`
   */
  keepNull?: boolean;
  /**
   * If set to `false`, object properties that already exist in the old
   * document will be overwritten rather than merged. This does not affect
   * arrays.
   *
   * Default: `true`
   */
  mergeObjects?: boolean;
  /**
   * If set to a document revision, the document will only be updated if its
   * `_rev` matches the given revision.
   */
  ifMatch?: string;
  /**
   * If set to `true`, existing entries in in-memory index caches will be
   * updated if document updates affect the edge index or cache-enabled
   * persistent indexes.
   *
   * Default: `false`
   */
  refillIndexCaches?: boolean;
  /**
   * If set, the attribute with the name specified by the option is looked up
   * in the stored document and the attribute value is compared numerically to
   * the value of the versioning attribute in the supplied document that is
   * supposed to update/replace it.
   */
  versionAttribute?: string;
};

/**
 * Options for removing a document from a collection.
 */
export type RemoveDocumentOptions = {
  /**
   * If set to `true`, changes will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnOld?: boolean;
  /**
   * If set to `true`, no data will be returned by the server. This option can
   * be used to reduce network traffic.
   *
   * Default: `false`
   */
  silent?: boolean;
  /**
   * If set to a document revision, the document will only be removed if its
   * `_rev` matches the given revision.
   */
  ifMatch?: string;
  /**
   * If set to `true`, existing entries in in-memory index caches will be
   * deleted if document removals affect the edge index or cache-enabled
   * persistent indexes.
   *
   * Default: `false`
   */
  refillIndexCaches?: boolean;
};

/**
 * Options for bulk importing documents into a collection.
 */
export type ImportDocumentsOptions = {
  /**
   * (Edge collections only.) Prefix to prepend to `_from` attribute values.
   */
  fromPrefix?: string;
  /**
   * (Edge collections only.) Prefix to prepend to `_to` attribute values.
   */
  toPrefix?: string;
  /**
   * If set to `true`, the collection is truncated before the data is imported.
   *
   * Default: `false`
   */
  overwrite?: boolean;
  /**
   * Whether to wait for the documents to have been synced to disk.
   */
  waitForSync?: boolean;
  /**
   * Controls behavior when a unique constraint is violated on the document key.
   *
   * * `"error"`: the document will not be imported.
   * * `"update`: the document will be merged into the existing document.
   * * `"replace"`: the document will replace the existing document.
   * * `"ignore"`: the document will not be imported and the unique constraint
   *   error will be ignored.
   *
   * Default: `"error"`
   */
  onDuplicate?: "error" | "update" | "replace" | "ignore";
  /**
   * If set to `true`, the import will abort if any error occurs.
   */
  complete?: boolean;
  /**
   * Whether the response should contain additional details about documents
   * that could not be imported.
   */
  details?: boolean;
};

/**
 * Options for retrieving a document's edges from a collection.
 */
export type DocumentEdgesOptions = {
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
};
//#endregion

//#region Document operation results
/**
 * Represents a bulk operation failure for an individual document.
 */
export type DocumentOperationFailure = {
  /**
   * Indicates that the operation failed.
   */
  error: true;
  /**
   * Human-readable description of the failure.
   */
  errorMessage: string;
  /**
   * Numeric representation of the failure.
   */
  errorNum: number;
};

/**
 * Metadata returned by a document operation.
 */
export type DocumentOperationMetadata = DocumentMetadata & {
  /**
   * Revision of the document that was updated or replaced by this operation.
   */
  _oldRev?: string;
};

/**
 * Result of a collection bulk import.
 */
export type ImportDocumentsResult = {
  /**
   * Whether the import failed.
   */
  error: false;
  /**
   * Number of new documents imported.
   */
  created: number;
  /**
   * Number of documents that failed with an error.
   */
  errors: number;
  /**
   * Number of empty documents.
   */
  empty: number;
  /**
   * Number of documents updated.
   */
  updated: number;
  /**
   * Number of documents that failed with an error that is ignored.
   */
  ignored: number;
  /**
   * Additional details about any errors encountered during the import.
   */
  details?: string[];
};

/**
 * Result of retrieving edges in a collection.
 */
export type DocumentEdgesResult<T extends Record<string, any> = any> = {
  edges: Edge<T>[];
  stats: {
    scannedIndex: number;
    filtered: number;
  };
};
//#endregion

//#region Document selectors
/**
 * A value that can be used to identify a document within a collection in
 * arangojs methods, i.e. a partial ArangoDB document or the value of a
 * document's `_key` or `_id`.
 *
 * See {@link DocumentMetadata}.
 */
export type DocumentSelector =
  | ObjectWithDocumentId
  | ObjectWithDocumentKey
  | string;

/**
 * An object with an ArangoDB document `_id` property.
 *
 * See {@link DocumentMetadata}.
 */
export type ObjectWithDocumentId = {
  [key: string]: any;
  _id: string;
};

/**
 * An object with an ArangoDB document `_key` property.
 *
 * See {@link DocumentMetadata}.
 */
export type ObjectWithDocumentKey = {
  [key: string]: any;
  _key: string;
};

/**
 * @internal
 */
export function _documentHandle(
  selector: DocumentSelector,
  collectionName: string,
  strict: boolean = true,
): string {
  if (typeof selector !== "string") {
    if (selector._id) {
      return _documentHandle(selector._id, collectionName);
    }
    if (selector._key) {
      return _documentHandle(selector._key, collectionName);
    }
    throw new Error(
      "Document handle must be a string or an object with a _key or _id attribute",
    );
  }
  if (selector.includes("/")) {
    const [head] = selector.split("/");
    if (strict && head !== collectionName) {
      throw new Error(
        `Document ID "${selector}" does not match collection name "${collectionName}"`,
      );
    }
    return selector;
  }
  return `${collectionName}/${selector}`;
}
//#endregion
