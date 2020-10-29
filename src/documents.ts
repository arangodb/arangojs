/**
 * ```ts
 * import type { Document, Edge } from "arangojs/documents";
 * ```
 *
 * The "documents" module provides document/edge related types for TypeScript.
 *
 * @packageDocumentation
 */

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

/**
 * Type representing an object that can be stored in a collection.
 */
export type DocumentData<T extends object = any> = T &
  Partial<DocumentMetadata> &
  Partial<EdgeMetadata>;

/**
 * Type representing an object that can be stored in an edge collection.
 */
export type EdgeData<T extends object = any> = T &
  Partial<DocumentMetadata> &
  EdgeMetadata;

/**
 * Type representing a document stored in a collection.
 */
export type Document<T extends object = any> = T &
  DocumentMetadata &
  Partial<EdgeMetadata>;

/**
 * Type representing an edge document stored in an edge collection.
 */
export type Edge<T extends object = any> = T & DocumentMetadata & EdgeMetadata;

/**
 * Type representing patch data for a given object type to represent a payload
 * ArangoDB can apply in a document PATCH request (i.e. a partial update).
 *
 * This differs from `Partial` in that it also applies itself to any nested
 * objects recursively.
 */
export type Patch<T = object> = { [K in keyof T]?: T[K] | Patch<T[K]> };

/**
 * An object with an ArangoDB document `_id` property.
 *
 * See {@link DocumentMetadata}.
 */
export type ObjectWithId = {
  [key: string]: any;
  _id: string;
};

/**
 * An object with an ArangoDB document `_key` property.
 *
 * See {@link DocumentMetadata}.
 */
export type ObjectWithKey = {
  [key: string]: any;
  _key: string;
};

/**
 * A value that can be used to identify a document within a collection in
 * arangojs methods, i.e. a partial ArangoDB document or the value of a
 * document's `_key` or `_id`.
 *
 * See {@link DocumentMetadata}.
 */
export type DocumentSelector = ObjectWithId | ObjectWithKey | string;

/**
 * @internal
 * @hidden
 */
export function _documentHandle(
  selector: DocumentSelector,
  collectionName: string
): string {
  if (typeof selector !== "string") {
    if (selector._id) {
      return _documentHandle(selector._id, collectionName);
    }
    if (selector._key) {
      return _documentHandle(selector._key, collectionName);
    }
    throw new Error(
      "Document handle must be a string or an object with a _key or _id attribute"
    );
  }
  if (selector.includes("/")) {
    if (!selector.startsWith(`${collectionName}/`)) {
      throw new Error(
        `Document ID "${selector}" does not match collection name "${collectionName}"`
      );
    }
    return selector;
  }
  return `${collectionName}/${selector}`;
}
