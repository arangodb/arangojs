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

import { AnalyzerFeature } from "./analyzer";
import { Compression, Direction, TierConsolidationPolicy } from "./view";

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
   * If set to `false`, inserting duplicate index values from the same
   * document will lead to a unique constraint error if this is a unique index.
   *
   * Default: `true`
   */
  deduplicate?: boolean;
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
      legacyPolygons?: boolean;
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
       * If set to `true`, the index will use pre-3.10 rules for parsing
       * GeoJSON polygons. This option is always implicitly `true` when using
       * ArangoDB 3.9 or lower.
       */
      legacyPolygons?: boolean;
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
   * If set to `true`, a unique index will be created.
   *
   * Default: `false`
   */
  unique?: boolean;
  /**
   * If set to `true`, the index will be created in the background to reduce
   * the write-lock duration for the collection during index creation.
   *
   * Default: `false`
   */
  inBackground?: boolean;
};

/**
 * (Enterprise Edition only.) Options for a nested field in an inverted index.
 */
export type InvertedIndexNestedFieldOptions = {
  /**
   * An attribute path.
   */
  name: string;
  /**
   * Name of the Analyzer to apply to the values of this field.
   *
   * Defaults to the `analyzer` specified on the parent options or on the index
   * itself.
   */
  analyzer?: string;
  /**
   * List of Analyzer features to enable for this field's Analyzer.
   *
   * Defaults to the features of the Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * If set to `true` array values will be indexed using the same behavior as
   * ArangoSearch Views. This option only applies when using the index in a
   * SearchAlias View.
   *
   * Defaults to the value of `searchField` specified on the index itself.
   */
  searchField?: boolean;
  /**
   * Sub-objects to index to allow querying for co-occurring values.
   */
  nested?: (string | InvertedIndexNestedFieldOptions)[];
};

/**
 * Options for an attribute path in an inverted index.
 */
export type InvertedIndexFieldOptions = {
  /**
   * An attribute path.
   */
  name: string;
  /**
   * Name of the Analyzer to apply to the values of this field.
   *
   * Defaults to the `analyzer` specified on the index itself.
   */
  analyzer?: string;
  /**
   * List of Analyzer features to enable for this field's Analyzer.
   *
   * Defaults to the features of the Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * If set to `true`, all document attributes are indexed, excluding any
   * sub-attributes configured in the `fields` array. The `analyzer` and
   * `features` properties apply to the sub-attributes. This option only
   * applies when using the index in a SearchAlias View.
   *
   * Defaults to the value of `includeAllFields` specified on the index itself.
   */
  includeAllFields?: boolean;
  /**
   * If set to `true` array values will be indexed using the same behavior as
   * ArangoSearch Views. This option only applies when using the index in a
   * SearchAlias View.
   *
   * Defaults to the value of `searchField` specified on the index itself.
   */
  searchField?: boolean;
  /**
   * If set to `true`, the position of values in array values are tracked and
   * need to be specified in queries. Otherwise all values in an array are
   * treated as equivalent. This option only applies when using the index in a
   * SearchAlias View.
   *
   * Defaults to the value of `trackListPositions` specified on the index
   * itself.
   */
  trackListPositions?: boolean;
  /**
   * (Enterprise Edition only.) Sub-objects to index to allow querying for
   * co-occurring values.
   */
  nested?: (string | InvertedIndexNestedFieldOptions)[];
  /**
   * (Enterprise Edition only.) Always cache field normalization values in
   * memory.
   *
   * Defaults to the value of `cache` specified on the index itself.
   */
  cache?: boolean;
};

/**
 * Options for defining a stored value on an inverted index.
 */
export type InvertedIndexStoredValueOptions = {
  /**
   * The attribute paths to store.
   */
  fields: string[];
  /**
   * How the attribute values should be compressed.
   *
   * Default: `"lz4"`
   */
  compression?: Compression;
  /**
   * (Enterprise Edition only.) Always cache stored values in memory.
   *
   * Default: `false`
   */
  cache?: boolean;
};

/**
 * Options for defining a primary sort field on an inverted index.
 */
export type InvertedIndexPrimarySortFieldOptions = {
  /**
   * The attribute path to sort by.
   */
  field: string;
  /**
   * The sorting direction.
   */
  direction: Direction;
};

/**
 * Options for creating an inverted index.
 */
export type EnsureInvertedIndexOptions = {
  /**
   * Type of this index.
   */
  type: "inverted";
  /**
   * An array of attribute paths or objects specifying options for the fields.
   */
  fields: (string | InvertedIndexFieldOptions)[];
  /**
   * A unique name for this index.
   */
  name?: string;
  /**
   * If set to `true` array values will by default be indexed using the same
   * behavior as ArangoSearch Views. This option only applies when using the
   * index in a SearchAlias View.
   *
   * Default: `false`
   */
  searchField?: boolean;
  /**
   * An array of attribute paths that will be stored in the index but can not
   * be used for index lookups or sorting but can avoid full document lookups.
   */
  storedValues?: InvertedIndexStoredValueOptions[];
  /**
   * Primary sort order to optimize AQL queries using a matching sort order.
   */
  primarySort?: {
    /**
     * An array of fields to sort the index by.
     */
    fields: InvertedIndexPrimarySortFieldOptions[];
    /**
     * How the primary sort data should be compressed.
     *
     * Default: `"lz4"`
     */
    compression?: Compression;
    /**
     * (Enterprise Edition only.) Always cache primary sort columns in memory.
     *
     * Default: `false`
     */
    cache?: boolean;
  };
  /**
   * (Enterprise Edition only.) Always cache the primary key column in memory.
   *
   * Default: `false`
   */
  primaryKeyCache?: boolean;
  /**
   * Name of the default Analyzer to apply to the values of indexed fields.
   *
   * Default: `"identity"`
   */
  analyzer?: string;
  /**
   * List of Analyzer features to enable for the default Analyzer.
   *
   * Defaults to the Analyzer's features.
   */
  features?: AnalyzerFeature[];
  /**
   * If set to `true`, all document attributes are indexed, excluding any
   * sub-attributes configured in the `fields` array. The `analyzer` and
   * `features` properties apply to the sub-attributes. This option only
   * applies when using the index in a SearchAlias View.
   *
   * Default: `false`
   */
  includeAllFields?: boolean;
  /**
   * If set to `true`, the position of values in array values are tracked and
   * need to be specified in queries. Otherwise all values in an array are
   * treated as equivalent. This option only applies when using the index in a
   * SearchAlias View.
   *
   * Default: `false`
   */
  trackListPositions?: boolean;
  /**
   * The number of threads to use for indexing the fields.
   *
   * Default: `2`
   */
  parallelism?: number;
  /**
   * Wait at least this many commits between removing unused files in the
   * ArangoSearch data directory.
   *
   * Default: `2`
   */
  cleanupIntervalStep?: number;
  /**
   * Wait at least this many milliseconds between committing View data store
   * changes and making documents visible to queries.
   *
   * Default: `1000`
   */
  commitIntervalMsec?: number;
  /**
   * Wait at least this many milliseconds between applying
   * `consolidationPolicy` to consolidate View data store and possibly release
   * space on the filesystem.
   *
   * Default: `1000`
   */
  consolidationIntervalMsec?: number;
  /**
   * The consolidation policy to apply for selecting which segments should be
   * merged.
   *
   * Default: `{ type: "tier" }`
   */
  consolidationPolicy?: TierConsolidationPolicy;
  /**
   * Maximum number of writers (segments) cached in the pool.
   *
   * Default: `64`
   */
  writeBufferIdle?: number;
  /**
   * Maximum number of concurrent active writers (segments) that perform a
   * transaction.
   *
   * Default: `0` (disabled)
   */
  writeBufferActive?: number;
  /**
   * Maximum memory byte size per writer (segment) before a writer (segment)
   * flush is triggered.
   *
   * Default: `33554432` (32 MiB)
   */
  writeBufferSizeMax?: number;
  /**
   * If set to `true`, the index will be created in the background to reduce
   * the write-lock duration for the collection during index creation.
   *
   * Default: `false`
   */
  inBackground?: boolean;
  /**
   * (Enterprise Edition only.) Always cache field normalization values in
   * memory.
   *
   * Default: `false`
   */
  cache?: boolean;
};

/**
 * Shared attributes of all index types.
 */
export type GenericIndex = {
  /**
   * A unique name for this index.
   */
  name: string;
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
  deduplicate: boolean;
  estimates: boolean;
  storedValues?: string[];
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
 * An object representing a ZKD index.
 */
export type ZkdIndex = GenericIndex & {
  type: "zkd";
  fields: string[];
  fieldValueTypes: "double";
};

/**
 * (Enterprise Edition only.) An object representing a nested field in an
 * inverted index.
 */
export type InvertedIndexNestedField = {
  name: string;
  analyzer?: string;
  features?: AnalyzerFeature[];
  searchField?: boolean;
  nested?: InvertedIndexNestedField[];
};

/**
 * An object representing an inverted index.
 */
export type InvertedIndex = GenericIndex & {
  type: "inverted";
  fields: {
    name: string;
    analyzer?: string;
    features?: AnalyzerFeature[];
    includeAllFields?: boolean;
    searchField?: boolean;
    trackListPositions?: boolean;
    nested?: InvertedIndexNestedField[];
    cache?: boolean;
  }[];
  searchField: boolean;
  cache?: boolean;
  storedValues: {
    fields: string[];
    compression: Compression;
    cache?: boolean;
  }[];
  primarySort: {
    fields: {
      field: string;
      direction: Direction;
    }[];
    compression: Compression;
    cache?: boolean;
  };
  primaryKeyCache?: boolean;
  analyzer: string;
  features: AnalyzerFeature[];
  includeAllFields: boolean;
  trackListPositions: boolean;
  parallelism: number;
  cleanupIntervalStep: number;
  commitIntervalMsec: number;
  consolidationIntervalMsec: number;
  consolidationPolicy: Required<TierConsolidationPolicy>;
  writeBufferIdle: number;
  writeBufferActive: number;
  writeBufferSizeMax: number;
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
  | ZkdIndex
  | InvertedIndex;

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
    selector = tail.join("/").normalize("NFC");
    return [normalizedHead, selector].join("/");
  }
  return `${collectionName}/${String(selector).normalize("NFC")}`;
}
