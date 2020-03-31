export type DocumentMetadata = {
  _key: string;
  _id: string;
  _rev: string;
};

export type EdgeMetadata = {
  _from: string;
  _to: string;
};

export type DocumentData<T extends object = any> = T &
  Partial<DocumentMetadata> &
  Partial<EdgeMetadata>;

export type EdgeData<T extends object = any> = T &
  Partial<DocumentMetadata> &
  EdgeMetadata;

export type Document<T extends object = any> = T &
  DocumentMetadata &
  Partial<EdgeMetadata>;

export type Edge<T extends object = any> = T & DocumentMetadata & EdgeMetadata;

export type ObjectWithId = {
  [key: string]: any;
  _id: string;
};

export type ObjectWithKey = {
  [key: string]: any;
  _key: string;
};

export type DocumentSelector = ObjectWithId | ObjectWithKey | string;

/** @hidden @internal */
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
