/**
 * ```ts
 * import type {
 *   FulltextIndex,
 *   GeoIndex,
 *   PersistentIndex,
 *   PrimaryIndex,
 *   TtlIndex,
 *   ZkdIndex,
 * } from "arangojs/indexes";
 * ```
 *
 * The "indexes" module provides index-related types for TypeScript.
 *
 * @packageDocumentation
 */

/**
 * Options for creating a persistent index.
 */
export type EnsurePersistentIndexOptions = {
  /**
   * Type of this index.
   */
  type: "persistent";
  /**
   * An array of attribute paths.
   */
  fields: string[];
  /**
   * A unique name for this index.
   */
  name?: string;
  /**
   * If set to `true`, a unique index will be created.
   *
   * Default: `false`
   */
  unique?: boolean;
  /**
   * If set to `true`, the index will omit documents that do not contain at
   * least one of the attribute paths in `fields` and these documents will be
   * ignored for uniqueness checks.
   *
   * Default: `false`
   */
  sparse?: boolean;
  /**
   * If set to `false`, index selectivity estimates will be disabled for this
   * index.
   *
   * Default: `true`
   */
  estimates?: boolean;
  /**
   * If set to `true`, the index will be created in the background to reduce
   * the write-lock duration for the collection during index creation.
   *
   * Default: `false`
   */
  inBackground?: boolean;
  /**
   * If set to `true`, an in-memory hash cache will be put in front of the
   * persistent index.
   *
   * Default: `false`
   */
  cacheEnabled?: boolean;
  /**
   * An array of attribute paths that will be stored in the index but can not
   * be used for index lookups or sorting but can avoid full document lookups.
   */
  storedValues?: string[];
};

/**
 * Options for creating a geo index.
 */
export type EnsureGeoIndexOptions =
  | {
      type: "geo";
      /**
       * If set to `true`, `fields` must be an array containing a single attribute
       * path and the attribute value must be an array with two values, the first
       * of which will be interpreted as the longitude and the second of which will
       * be interpreted as the latitude of the document.
       *
       * Default: `false`
       */
      geoJson?: false;
      /**
       * If set to `true`, the index will use pre-3.10 rules for parsing
       * GeoJSON polygons. This option is always implicitly `true` when using
       * ArangoDB 3.9 or lower.
       */
      legacyPolygons?: false;
      /**
       * Attribute paths for the document's latitude and longitude values.
       */
      fields: [string, string];
      /**
       * A unique name for this index.
       */
      name?: string;
      /**
       * If set to `true`, the index will be created in the background to reduce
       * the write-lock duration for the collection during index creation.
       *
       * Default: `false`
       */
      inBackground?: boolean;
    }
  | {
      type: "geo";
      /**
       * If set to `true`, `fields` must be an array containing a single attribute
       * path and the attribute value must be an array with two values, the first
       * of which will be interpreted as the longitude and the second of which will
       * be interpreted as the latitude of the document.
       *
       * Default: `false`
       */
      geoJson?: boolean;
      /**
       * An array containing the attribute path for an array containing two values,
       * the first of which will be interpreted as the latitude, the second as the
       * longitude. If `geoJson` is set to `true`, the order is reversed to match
       * the GeoJSON format.
       */
      fields: [string];
      /**
       * A unique name for this index.
       */
      name?: string;
      /**
       * If set to `true`, the index will be created in the background to reduce
       * the write-lock duration for the collection during index creation.
       *
       * Default: `false`
       */
      inBackground?: boolean;
    };

/**
 * Options for creating a fulltext index.
 *
 * @deprecated Fulltext indexes have been deprecated in ArangoDB 3.10 and
 * should be replaced with ArangoSearch.
 */
export type EnsureFulltextIndexOptions = {
  /**
   * Type of this index.
   */
  type: "fulltext";
  /**
   * An array containing exactly one attribute path.
   */
  fields: [string];
  /**
   * A unique name for this index.
   */
  name?: string;
  /**
   * Minimum character length of words to index.
   */
  minLength?: number;
  /**
   * If set to `true`, the index will be created in the background to reduce
   * the write-lock duration for the collection during index creation.
   *
   * Default: `false`
   */
  inBackground?: boolean;
};

/**
 * Options for creating a TTL index.
 */
export type EnsureTtlIndexOptions = {
  /**
   * Type of this index.
   */
  type: "ttl";
  /**
   * An array containing exactly one attribute path.
   */
  fields: [string];
  /**
   * A unique name for this index.
   */
  name?: string;
  /**
   * Duration in seconds after the attribute value at which the document will
   * be considered as expired.
   */
  expireAfter: number;
  /**
   * If set to `true`, the index will be created in the background to reduce
   * the write-lock duration for the collection during index creation.
   *
   * Default: `false`
   */
  inBackground?: boolean;
};

/**
 * Options for creating a ZKD index.
 */
export type EnsureZkdIndexOptions = {
  /**
   * Type of this index.
   */
  type: "zkd";
  /**
   * An array containing attribute paths for the dimensions.
   */
  fields: string[];
  /**
   * Data type of the dimension attributes.
   */
  fieldValueTypes: "double";
  /**
   * A unique name for this index.
   */
  name?: string;
  /**
   * If set to `true`, the index will be created in the background to reduce
   * the write-lock duration for the collection during index creation.
   *
   * Default: `false`
   */
  inBackground?: boolean;
};

/**
 * Shared attributes of all index types.
 */
export type GenericIndex = {
  /**
   * A unique name for this index.
   */
  name?: string;
  /**
   * A unique identifier for this index.
   */
  id: string;
  /**
   * Whether documents not containing at least one of the attribute paths
   * are omitted by this index.
   */
  sparse: boolean;
  /**
   * Whether this index enforces uniqueness for values of its attribute paths.
   */
  unique: boolean;
};

/**
 * An object representing a persistent index.
 */
export type PersistentIndex = GenericIndex & {
  type: "persistent";
  fields: string[];
  cacheEnabled: boolean;
  storedValues: string[];
};

/**
 * An object representing a primary index.
 */
export type PrimaryIndex = GenericIndex & {
  type: "primary";
  fields: string[];
  selectivityEstimate: number;
};

/**
 * An object representing a fulltext index.
 *
 * @deprecated Fulltext indexes have been deprecated in ArangoDB 3.10 and
 * should be replaced with ArangoSearch.
 */
export type FulltextIndex = GenericIndex & {
  type: "fulltext";
  fields: [string];
  minLength: number;
};

/**
 * An object representing a geo index.
 */
export type GeoIndex = GenericIndex & {
  type: "geo";
  fields: [string] | [string, string];
  geoJson: boolean;
  legacyPolygons: boolean;
  bestIndexedLevel: number;
  worstIndexedLevel: number;
  maxNumCoverCells: number;
};

/**
 * An object representing a TTL index.
 */
export type TtlIndex = GenericIndex & {
  type: "ttl";
  fields: [string];
  expireAfter: number;
  selectivityEstimate: number;
};

/**
 * An object representing a TTL index.
 */
export type ZkdIndex = GenericIndex & {
  type: "zkd";
  fields: string[];
  fieldValueTypes: "double";
};

/**
 * An object representing an index.
 */
export type Index =
  | GeoIndex
  | FulltextIndex
  | PersistentIndex
  | PrimaryIndex
  | TtlIndex
  | ZkdIndex;

export type ObjectWithId = {
  [key: string]: any;
  id: string;
};

export type ObjectWithName = {
  [key: string]: any;
  name: string;
};

/**
 * Index name, id or object with a `name` or `id` property.
 */
export type IndexSelector = ObjectWithId | ObjectWithName | string;

/**
 * @internal
 */
export function _indexHandle(
  selector: IndexSelector,
  collectionName: string
): string {
  if (typeof selector !== "string") {
    if (selector.id) {
      return _indexHandle(selector.id, collectionName);
    }
    throw new Error(
      "Index handle must be a string or an object with an id attribute"
    );
  }
  if (selector.includes("/")) {
    const [head, ...tail] = selector.split("/");
    const normalizedHead = head.normalize("NFC");
    if (normalizedHead !== collectionName) {
      throw new Error(
        `Index ID "${selector}" does not match collection name "${collectionName}"`
      );
    }
    return [normalizedHead, ...tail].join("/");
  }
  return `${collectionName}/${selector}`;
}
