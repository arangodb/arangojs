/**
 * ```ts
 * import type { Analyzer } from "arangojs/analyzer.js";
 * ```
 *
 * The "analyzer" module provides analyzer related types and interfaces
 * for TypeScript.
 *
 * @packageDocumentation
 */
import { ArangoApiResponse } from "./connection.js";
import { Database } from "./database.js";
import { isArangoError } from "./error.js";
import { ANALYZER_NOT_FOUND } from "./lib/codes.js";

/**
 * Indicates whether the given value represents an {@link Analyzer}.
 *
 * @param analyzer - A value that might be an Analyzer.
 */
export function isArangoAnalyzer(analyzer: any): analyzer is Analyzer {
  return Boolean(analyzer && analyzer.isArangoAnalyzer);
}

/**
 * Name of a feature enabled for an Analyzer.
 */
export type AnalyzerFeature = "frequency" | "norm" | "position" | "offset";

/**
 * Analyzer type and its type-specific properties.
 */
export type CreateAnalyzerOptions =
  | CreateIdentityAnalyzerOptions
  | CreateDelimiterAnalyzerOptions
  | CreateMultiDelimiterAnalyzerOptions
  | CreateStemAnalyzerOptions
  | CreateNormAnalyzerOptions
  | CreateNgramAnalyzerOptions
  | CreateTextAnalyzerOptions
  | CreateSegmentationAnalyzerOptions
  | CreateAqlAnalyzerOptions
  | CreatePipelineAnalyzerOptions
  | CreateStopwordsAnalyzerOptions
  | CreateCollationAnalyzerOptions
  | CreateMinHashAnalyzerOptions
  | CreateClassificationAnalyzerOptions
  | CreateNearestNeighborsAnalyzerOptions
  | CreateWildcardAnalyzerOptions
  | CreateGeoJsonAnalyzerOptions
  | CreateGeoPointAnalyzerOptions
  | CreateGeoS2AnalyzerOptions;

/**
 * Options for creating an Identity Analyzer.
 */
export type CreateIdentityAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "identity";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   *
   * The `identity` Analyzer does not take additional properties.
   */
  properties?: Record<string, never>;
};

/**
 * Options for creating a Delimiter Analyzer.
 */
export type CreateDelimiterAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "delimiter";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   *
   * The value will be used as delimiter to split text into tokens as specified
   * in RFC 4180, without starting new records on newlines.
   */
  properties: string | { delimiter: string };
};

/**
 * Options for creating a Multi-Delimiter Analyzer.
 */
export type CreateMultiDelimiterAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "multi_delimiter";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   *
   * The value will be used as delimiter to split text into tokens as specified
   * in RFC 4180, without starting new records on newlines.
   */
  properties: { delimiters: string[] };
};

/**
 * Options for creating a Stem Analyzer.
 */
export type CreateStemAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "stem";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   *
   * The value defines the text locale.
   *
   * Format: `language[_COUNTRY][.encoding][@variant]`
   */
  properties: { locale: string };
};

/**
 * Options for creating a Norm Analyzer.
 */
export type CreateNormAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "norm";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * Text locale.
     *
     * Format: `language[_COUNTRY][.encoding][@variant]`
     */
    locale: string;
    /**
     * Case conversion.
     *
     * Default: `"lower"`
     */
    case?: "lower" | "none" | "upper";
    /**
     * Preserve accents in returned words.
     *
     * Default: `false`
     */
    accent?: boolean;
  };
};

/**
 * Options for creating an Ngram Analyzer.
 */
export type CreateNgramAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "ngram";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * Maximum n-gram length.
     */
    max: number;
    /**
     * Minimum n-gram length.
     */
    min: number;
    /**
     * Output the original value as well.
     */
    preserveOriginal: boolean;
  };
};

/**
 * Options for creating a Text Analyzer.
 */
export type CreateTextAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "text";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * Text locale.
     *
     * Format: `language[_COUNTRY][.encoding][@variant]`
     */
    locale: string;
    /**
     * Case conversion.
     *
     * Default: `"lower"`
     */
    case?: "lower" | "none" | "upper";
    /**
     * Words to omit from result.
     *
     * Defaults to the words loaded from the file at `stopwordsPath`.
     */
    stopwords?: string[];
    /**
     * Path with a `language` sub-directory containing files with words to omit.
     *
     * Defaults to the path specified in the server-side environment variable
     * `IRESEARCH_TEXT_STOPWORD_PATH` or the current working directory of the
     * ArangoDB process.
     */
    stopwordsPath?: string;
    /**
     * Preserve accents in returned words.
     *
     * Default: `false`
     */
    accent?: boolean;
    /**
     * Apply stemming on returned words.
     *
     * Default: `true`
     */
    stemming?: boolean;
    /**
     * If present, then edge n-grams are generated for each token (word).
     */
    edgeNgram?: { min?: number; max?: number; preserveOriginal?: boolean };
  };
};

/**
 * Options for creating a Segmentation Analyzer
 */
export type CreateSegmentationAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "segmentation";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * Which tokens should be returned.
     *
     * Default: `"alpha"`
     */
    break?: "all" | "alpha" | "graphic";
    /**
     * What case all returned tokens should be converted to if applicable.
     *
     * Default: `"none"`
     */
    case?: "lower" | "upper" | "none";
  };
};

/**
 * Options for creating an AQL Analyzer
 */
export type CreateAqlAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "aql";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * AQL query to be executed.
     */
    queryString: string;
    /**
     * If set to `true`, the position is set to `0` for all members of the query result array.
     *
     * Default: `false`
     */
    collapsePositions?: boolean;
    /**
     * If set to `false`, `null` values will be discarded from the View index.
     *
     * Default: `true`
     */
    keepNull?: boolean;
    /**
     * Number between `1` and `1000` that determines the batch size for reading
     * data from the query.
     *
     * Default: `1`
     */
    batchSize?: number;
    /**
     * Memory limit for query execution in bytes.
     *
     * Default: `1048576` (1 MiB)
     */
    memoryLimit?: number;
    /**
     * Data type of the returned tokens.
     *
     * Default: `"string"`
     */
    returnType?: "string" | "number" | "bool";
  };
};

/**
 * Options for creating a Pipeline Analyzer
 */
export type CreatePipelineAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "pipeline";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * Definitions for Analyzers to chain in this Pipeline Analyzer.
     */
    pipeline: Omit<CreateAnalyzerOptions, "features">[];
  };
};

/**
 * Options for creating a Stopwords Analyzer
 */
export type CreateStopwordsAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "stopwords";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * Array of strings that describe the tokens to be discarded.
     */
    stopwords: string[];
    /**
     * Whether stopword values should be interpreted as hex-encoded strings.
     *
     * Default: `false`
     */
    hex?: boolean;
  };
};

/**
 * Options for creating a Collation Analyzer
 */
export type CreateCollationAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "collation";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * Text locale.
     *
     * Format: `language[_COUNTRY][.encoding][@variant]`
     */
    locale: string;
  };
};

/**
 * (Enterprise Edition only.) Options for creating a MinHash Analyzer
 */
export type CreateMinHashAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "minhash";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * An Analyzer definition-like object with `type` and `properties` attributes.
     */
    analyzer: Omit<CreateAnalyzerOptions, "features">;
    /**
     * Size of the MinHash signature.
     */
    numHashes: number;
  };
};

/**
 * (Enterprise Edition only.) Options for creating a Classification Analyzer
 */
export type CreateClassificationAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "classification";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * On-disk path to the trained fastText supervised model.
     */
    model_location: string;
    /**
     * Number of class labels that will be produced per input.
     *
     * Default: `1`
     */
    top_k?: number;
    /**
     * Probability threshold for which a label will be assigned to an input.
     *
     * Default: `0.99`
     */
    threshold?: number;
  };
};

/**
 * (Enterprise Edition only.) Options for creating a NearestNeighbors Analyzer.
 */
export type CreateNearestNeighborsAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "nearest_neighbors";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * On-disk path to the trained fastText supervised model.
     */
    model_location: string;
    /**
     * Number of class labels that will be produced per input.
     *
     * Default: `1`
     */
    top_k?: number;
  };
};

/**
 * Options for creating a Wildcard Analyzer.
 */
export type CreateWildcardAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "wildcard";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * N-gram length. Must be a positive integer greater than or equal to 2.
     */
    ngramSize: string;
    /**
     * An Analyzer definition-like object with `type` and `properties` attributes.
     */
    analyzer?: Omit<CreateAnalyzerOptions, "features">;
  };
};

/**
 * Options for creating a GeoJSON Analyzer
 */
export type CreateGeoJsonAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "geojson";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * If set to `"centroid"`, only the centroid of the input geometry will be
     * computed and indexed.
     *
     * If set to `"point"` only GeoJSON objects of type Point will be indexed and
     * all other geometry types will be ignored.
     *
     * Default: `"shape"`
     */
    type?: "shape" | "centroid" | "point";
    /**
     * Options for fine-tuning geo queries.
     *
     * Default: `{ maxCells: 20, minLevel: 4, maxLevel: 23 }`
     */
    options?: { maxCells?: number; minLevel?: number; maxLevel?: number };
  };
};

/**
 * Options for creating a GeoPoint Analyzer
 */
export type CreateGeoPointAnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "geopoint";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * Attribute paths of the latitude value relative to the field for which the
     * Analyzer is defined in the View.
     */
    latitude?: string[];
    /**
     * Attribute paths of the longitude value relative to the field for which the
     * Analyzer is defined in the View.
     */
    longitude?: string[];
    /**
     * Options for fine-tuning geo queries.
     *
     * Default: `{ maxCells: 20, minLevel: 4, maxLevel: 23 }`
     */
    options?: { minCells?: number; minLevel?: number; maxLevel?: number };
  };
};

/**
 * (Enterprise Edition only.) Options for creating a Geo S2 Analyzer
 */
export type CreateGeoS2AnalyzerOptions = {
  /**
   * Type of the Analyzer.
   */
  type: "geo_s2";
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
  /**
   * Additional properties for the Analyzer.
   */
  properties: {
    /**
     * If set to `"centroid"`, only the centroid of the input geometry will be
     * computed and indexed.
     *
     * If set to `"point"` only GeoJSON objects of type Point will be indexed and
     * all other geometry types will be ignored.
     *
     * Default: `"shape"`
     */
    type?: "shape" | "centroid" | "point";
    /**
     * Options for fine-tuning geo queries.
     *
     * Default: `{ maxCells: 20, minLevel: 4, maxLevel: 23 }`
     */
    options?: { maxCells?: number; minLevel?: number; maxLevel?: number };
    /**
     * If set to `"latLngDouble"`, each latitude and longitude value is stored
     * as an 8-byte floating-point value (16 bytes per coordinate pair).
     *
     * If set to `"latLngInt"`, each latitude and longitude value is stored as
     * a 4-byte integer value (8 bytes per coordinate pair).
     *
     * If set to `"s2Point"`, each longitude-latitude pair is stored in the
     * native format of Google S2 (24 bytes per coordinate pair).
     *
     * Default: `"latLngDouble"`
     */
    format?: "latLngDouble" | "latLngInt" | "s2Point";
  };
};

/**
 * Shared attributes of all Analyzer descriptions.
 */
export type GenericAnalyzerDescription = {
  /**
   * A unique name for this Analyzer.
   */
  name: string;
  /**
   * Features enabled for this Analyzer.
   */
  features: AnalyzerFeature[];
};

/**
 * An object describing an Analyzer.
 */
export type AnalyzerDescription =
  | IdentityAnalyzerDescription
  | DelimiterAnalyzerDescription
  | MultiDelimiterAnalyzerDescription
  | StemAnalyzerDescription
  | NormAnalyzerDescription
  | NgramAnalyzerDescription
  | TextAnalyzerDescription
  | SegmentationAnalyzerDescription
  | AqlAnalyzerDescription
  | PipelineAnalyzerDescription
  | StopwordsAnalyzerDescription
  | CollationAnalyzerDescription
  | MinHashAnalyzerDescription
  | ClassificationAnalyzerDescription
  | NearestNeighborsAnalyzerDescription
  | WildcardAnalyzerDescription
  | GeoJsonAnalyzerDescription
  | GeoPointAnalyzerDescription
  | GeoS2AnalyzerDescription;

/**
 * An object describing an Identity Analyzer.
 */
export type IdentityAnalyzerDescription = GenericAnalyzerDescription & {
  type: "identity";
  properties: Record<string, never>;
};

/**
 * An object describing a Delimiter Analyzer.
 */
export type DelimiterAnalyzerDescription = GenericAnalyzerDescription & {
  type: "delimiter";
  properties: { delimiter: string };
};

/**
 * An object describing a Multi Delimiter Analyzer.
 */
export type MultiDelimiterAnalyzerDescription = GenericAnalyzerDescription & {
  type: "multi_delimiter";
  properties: { delimiters: string[] };
};

/**
 * An object describing a Stem Analyzer.
 */
export type StemAnalyzerDescription = GenericAnalyzerDescription & {
  type: "stem";
  properties: { locale: string };
};

/**
 * An object describing a Norm Analyzer.
 */
export type NormAnalyzerDescription = GenericAnalyzerDescription & {
  type: "norm";
  properties: {
    locale: string;
    case: "lower" | "none" | "upper";
    accent: boolean;
  };
};

/**
 * An object describing an Ngram Analyzer.
 */
export type NgramAnalyzerDescription = GenericAnalyzerDescription & {
  type: "ngram";
  properties: {
    max: number;
    min: number;
    preserveOriginal: boolean;
  };
};

/**
 * An object describing a Text Analyzer.
 */
export type TextAnalyzerDescription = GenericAnalyzerDescription & {
  type: "text";
  properties: {
    locale: string;
    case: "lower" | "none" | "upper";
    stopwords: string[];
    stopwordsPath: string;
    accent: boolean;
    stemming: boolean;
    edgeNgram: { min: number; max: number; preserveOriginal: boolean };
  };
};

/**
 * An object describing a Segmentation Analyzer
 */
export type SegmentationAnalyzerDescription = GenericAnalyzerDescription & {
  type: "segmentation";
  properties: {
    break: "all" | "alpha" | "graphic";
    case: "lower" | "upper" | "none";
  };
};

/**
 * An object describing an AQL Analyzer
 */
export type AqlAnalyzerDescription = GenericAnalyzerDescription & {
  type: "aql";
  properties: {
    queryString: string;
    collapsePositions: boolean;
    keepNull: boolean;
    batchSize: number;
    memoryLimit: number;
    returnType: "string" | "number" | "bool";
  };
};

/**
 * An object describing a Pipeline Analyzer
 */
export type PipelineAnalyzerDescription = GenericAnalyzerDescription & {
  type: "pipeline";
  properties: {
    pipeline: Omit<AnalyzerDescription, "name" | "features">[];
  };
};

/**
 * An object describing a Stopwords Analyzer
 */
export type StopwordsAnalyzerDescription = GenericAnalyzerDescription & {
  type: "stopwords";
  properties: {
    stopwords: string[];
    hex: boolean;
  };
};

/**
 * An object describing a Collation Analyzer
 */
export type CollationAnalyzerDescription = GenericAnalyzerDescription & {
  type: "collation";
  properties: {
    locale: string;
  };
};

/**
 * (Enterprise Edition only.) An object describing a MinHash Analyzer
 */
export type MinHashAnalyzerDescription = GenericAnalyzerDescription & {
  type: "minhash";
  properties: {
    analyzer: Omit<AnalyzerDescription, "name" | "features">;
    numHashes: number;
  };
};

/**
 * (Enterprise Edition only.) An object describing a Classification Analyzer
 */
export type ClassificationAnalyzerDescription = GenericAnalyzerDescription & {
  type: "classification";
  properties: {
    model_location: string;
    top_k: number;
    threshold: number;
  };
};

/**
 * (Enterprise Edition only.) An object describing a NearestNeighbors Analyzer
 */
export type NearestNeighborsAnalyzerDescription = GenericAnalyzerDescription & {
  type: "nearest_neighbors";
  properties: {
    model_location: string;
    top_k: number;
  };
};

/**
 * An object describing a Wildcard Analyzer
 */
export type WildcardAnalyzerDescription = GenericAnalyzerDescription & {
  type: "wildcard";
  properties: {
    ngramSize: number;
    analyzer?: Omit<AnalyzerDescription, "name" | "features">;
  };
};

/**
 * An object describing a GeoJSON Analyzer
 */
export type GeoJsonAnalyzerDescription = GenericAnalyzerDescription & {
  type: "geojson";
  properties: {
    type: "shape" | "centroid" | "point";
    description: { maxCells: number; minLevel: number; maxLevel: number };
  };
};

/**
 * An object describing a GeoPoint Analyzer
 */
export type GeoPointAnalyzerDescription = GenericAnalyzerDescription & {
  type: "geopoint";
  properties: {
    latitude: string[];
    longitude: string[];
    description: { minCells: number; minLevel: number; maxLevel: number };
  };
};

/**
 * (Enterprise Edition only.) An object describing a GeoS2 Analyzer
 */
export type GeoS2AnalyzerDescription = GenericAnalyzerDescription & {
  type: "geo_s2";
  properties: {
    type: "shape" | "centroid" | "point";
    description: { maxCells: number; minLevel: number; maxLevel: number };
    format: "latLngDouble" | "latLngInt" | "s2Point";
  };
};

/**
 * Represents an Analyzer in a {@link database.Database}.
 */
export class Analyzer {
  protected _name: string;
  protected _db: Database;

  /**
   * @internal
   */
  constructor(db: Database, name: string) {
    this._db = db;
    this._name = name;
  }

  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB Analyzer.
   */
  get isArangoAnalyzer(): true {
    return true;
  }

  /**
   * Name of this Analyzer.
   *
   * See also {@link database.Database}.
   */
  get name() {
    return this._name;
  }

  /**
   * Checks whether the Analyzer exists.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzer = db.analyzer("some-analyzer");
   * const result = await analyzer.exists();
   * // result indicates whether the Analyzer exists
   * ```
   */
  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err: any) {
      if (isArangoError(err) && err.errorNum === ANALYZER_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Retrieves the Analyzer definition for the Analyzer.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzer = db.analyzer("some-analyzer");
   * const definition = await analyzer.get();
   * // definition contains the Analyzer definition
   * ```
   */
  get(): Promise<ArangoApiResponse<AnalyzerDescription>> {
    return this._db.request({
      path: `/_api/analyzer/${encodeURIComponent(this._name)}`,
    });
  }

  /**
   * Creates a new Analyzer with the given `options` and the instance's name.
   *
   * See also {@link database.Database#createAnalyzer}.
   *
   * @param options - Options for creating the Analyzer.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzer = db.analyzer("potatoes");
   * await analyzer.create({ type: "identity" });
   * // the identity Analyzer "potatoes" now exists
   * ```
   */
  create<Options extends CreateAnalyzerOptions>(
    options: Options
  ): Promise<
    Options extends CreateIdentityAnalyzerOptions
      ? IdentityAnalyzerDescription
      : Options extends CreateDelimiterAnalyzerOptions
        ? DelimiterAnalyzerDescription
        : Options extends CreateStemAnalyzerOptions
          ? StemAnalyzerDescription
          : Options extends CreateNormAnalyzerOptions
            ? NormAnalyzerDescription
            : Options extends CreateNgramAnalyzerOptions
              ? NgramAnalyzerDescription
              : Options extends CreateTextAnalyzerOptions
                ? TextAnalyzerDescription
                : Options extends CreateSegmentationAnalyzerOptions
                  ? SegmentationAnalyzerDescription
                  : Options extends CreateAqlAnalyzerOptions
                    ? AqlAnalyzerDescription
                    : Options extends CreatePipelineAnalyzerOptions
                      ? PipelineAnalyzerDescription
                      : Options extends CreateStopwordsAnalyzerOptions
                        ? StopwordsAnalyzerDescription
                        : Options extends CreateCollationAnalyzerOptions
                          ? CollationAnalyzerDescription
                          : Options extends CreateMinHashAnalyzerOptions
                            ? MinHashAnalyzerDescription
                            : Options extends CreateClassificationAnalyzerOptions
                              ? ClassificationAnalyzerDescription
                              : Options extends CreateNearestNeighborsAnalyzerOptions
                                ? NearestNeighborsAnalyzerDescription
                                : Options extends CreateGeoJsonAnalyzerOptions
                                  ? GeoJsonAnalyzerDescription
                                  : Options extends CreateGeoPointAnalyzerOptions
                                    ? GeoPointAnalyzerDescription
                                    : Options extends CreateGeoS2AnalyzerOptions
                                      ? GeoS2AnalyzerDescription
                                      : AnalyzerDescription
  > {
    return this._db.request({
      method: "POST",
      path: "/_api/analyzer",
      body: { name: this._name, ...options },
    });
  }

  /**
   * Deletes the Analyzer from the database.
   *
   * @param force - Whether the Analyzer should still be deleted even if it
   * is currently in use.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzer = db.analyzer("some-analyzer");
   * await analyzer.drop();
   * // the Analyzer "some-analyzer" no longer exists
   * ```
   */
  drop(force: boolean = false): Promise<ArangoApiResponse<{ name: string }>> {
    return this._db.request({
      method: "DELETE",
      path: `/_api/analyzer/${encodeURIComponent(this._name)}`,
      search: { force },
    });
  }
}
