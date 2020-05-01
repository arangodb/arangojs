/**
 * `import type { Document, Edge } from "arangojs/document";`
 *
 * TODO
 *
 * @packageDocumentation
 */

/**
 * TODO
 */
export type DocumentMetadata = {
  _key: string;
  _id: string;
  _rev: string;
};

/**
 * TODO
 */
export type EdgeMetadata = {
  _from: string;
  _to: string;
};

/**
 * TODO
 */
export type DocumentData<T extends object = any> = T &
  Partial<DocumentMetadata> &
  Partial<EdgeMetadata>;

/**
 * TODO
 */
export type EdgeData<T extends object = any> = T &
  Partial<DocumentMetadata> &
  EdgeMetadata;

/**
 * TODO
 */
export type Document<T extends object = any> = T &
  DocumentMetadata &
  Partial<EdgeMetadata>;

/**
 * TODO
 */
export type Edge<T extends object = any> = T & DocumentMetadata & EdgeMetadata;

/**
 * TODO
 */
export type ObjectWithId = {
  [key: string]: any;
  _id: string;
};

/**
 * TODO
 */
export type ObjectWithKey = {
  [key: string]: any;
  _key: string;
};

/**
 * TODO
 */
export type DocumentSelector = ObjectWithId | ObjectWithKey | string;

/**
 * TODO
 *
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
