/**
 * ```ts
 * import type { Analyzer } from "arangojs/analyzer";
 * ```
 *
 * The "analyzer" module provides analyzer related types and interfaces
 * for TypeScript.
 *
 * @packageDocumentation
 */
import { ArangoResponseMetadata } from "./connection";
import { Database } from "./database";
import { isArangoError } from "./error";
import { ANALYZER_NOT_FOUND } from "./lib/codes";

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
export type AnalyzerFeature = "frequency" | "norm" | "position";

/**
 * An object describing an Analyzer.
 */
export type AnalyzerDescription = AnalyzerInfo & {
  name: string;
  features: AnalyzerFeature[];
};

/**
 * Options for creating an Analyzer.
 */
export type CreateAnalyzerOptions = AnalyzerInfo & {
  /**
   * Features to enable for this Analyzer.
   */
  features?: AnalyzerFeature[];
};

/**
 * Analyzer type and its type-specific properties.
 */
export type AnalyzerInfo =
  | IdentityAnalyzerInfo
  | DelimiterAnalyzerInfo
  | StemAnalyzerInfo
  | NormAnalyzerInfo
  | NgramAnalyzerInfo
  | TextAnalyzerInfo
  | PipelineAnalyzer
  | AqlAnalyzer
  | GeoJsonAnalyzer
  | GeoPointAnalyzer
  | StopwordsAnalyzer;

/**
 * Analyzer type and type-specific properties for an Identity Analyzer.
 */
export type IdentityAnalyzerInfo = {
  /**
   * Type of the Analyzer.
   */
  type: "identity";
  /**
   * Additional properties for the Analyzer.
   *
   * The `identity` Analyzer does not take additional properties.
   */
  properties?: null;
};

/**
 * Analyzer type and type-specific properties for a Delimiter Analyzer.
 */
export type DelimiterAnalyzerInfo = {
  /**
   * Type of the Analyzer.
   */
  type: "delimiter";
  /**
   * Additional properties for the Analyzer.
   *
   * The value will be used as delimiter to split text into tokens as specified
   * in RFC 4180, without starting new records on newlines.
   */
  properties: string | { delimiter: string };
};

/**
 * Analyzer type and type-specific properties for a Stem Analyzer.
 */
export type StemAnalyzerInfo = {
  /**
   * Type of the Analyzer.
   */
  type: "stem";
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
 * Properties of a Norm Analyzer.
 */
export type NormAnalyzerProperties = {
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

/**
 * Analyzer type and type-specific properties for a Norm Analyzer.
 */
export type NormAnalyzerInfo = {
  /**
   * Type of the Analyzer.
   */
  type: "norm";
  /**
   * Additional properties for the Analyzer.
   */
  properties: NormAnalyzerProperties;
};

/**
 * Properties of an Ngram Analyzer.
 */
export type NgramAnalyzerProperties = {
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

/**
 * Analyzer type and type-specific properties for an Ngram Analyzer.
 */
export type NgramAnalyzerInfo = {
  /**
   * Type of the Analyzer.
   */
  type: "ngram";
  /**
   * Additional properties for the Analyzer.
   */
  properties: NgramAnalyzerProperties;
};

/**
 * Properties of a Text Analyzer.
 */
export type TextAnalyzerProperties = {
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

/**
 * Analyzer type and type-specific properties for a Text Analyzer.
 */
export type TextAnalyzerInfo = {
  /**
   * Type of the Analyzer.
   */
  type: "text";
  /**
   * Additional properties for the Analyzer.
   */
  properties: TextAnalyzerProperties;
};

/**
 * Properties of a Pipeline Analyzer.
 */
export type PipelineAnalyzerProperties = {
  /**
   * Definitions for Analyzers to chain in this Pipeline Analyzer.
   */
  pipeline: AnalyzerInfo[];
};

/**
 * Analyzer type and type-specific properties for a Pipeline Analyzer
 */
export type PipelineAnalyzer = {
  /**
   * Type of the Analyzer.
   */
  type: "pipeline";
  /**
   * Additional properties for the Analyzer.
   */
  properties: PipelineAnalyzerProperties;
};

/**
 * Properties of an AQL Analyzer.
 */
export type AqlAnalyzerProperties = {
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

/**
 * Analyzer type and type-specific properties for an AQL Analyzer
 */
export type AqlAnalyzer = {
  /**
   * Type of the Analyzer.
   */
  type: "aql";
  /**
   * Additional properties for the Analyzer.
   */
  properties: AqlAnalyzerProperties;
};

/**
 * Properties of a GeoJSON Analyzer.
 */
export type GeoJsonAnalyzerProperties = {
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

/**
 * Analyzer type and type-specific properties for a GeoJSON Analyzer
 */
export type GeoJsonAnalyzer = {
  /**
   * Type of the Analyzer.
   */
  type: "geojson";
  /**
   * Additional properties for the Analyzer.
   */
  properties: GeoJsonAnalyzerProperties;
};

/**
 * Properties of a GeoPoint Analyzer.
 */
export type GeoPointAnalyzerProperties = {
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

/**
 * Analyzer type and type-specific properties for a GeoPoint Analyzer
 */
export type GeoPointAnalyzer = {
  /**
   * Type of the Analyzer.
   */
  type: "geopoint";
  /**
   * Additional properties for the Analyzer.
   */
  properties: GeoPointAnalyzerProperties;
};

/**
 * Properties of a Stopwords Analyzer.
 */
export type StopwordsAnalyzerProperties = {
  /**
   * Hex-encoded strings that describe the tokens to be discarded.
   */
  stopwords: string[];
};

/**
 * Analyzer type and type-specific properties for a Stopwords Analyzer
 */
export type StopwordsAnalyzer = {
  /**
   * Type of the Analyzer.
   */
  type: "stopwords";
  /**
   * Additional properties for the Analyzer.
   */
  properties: StopwordsAnalyzerProperties;
};

/**
 * Represents an Analyzer in a {@link Database}.
 */
export class Analyzer {
  protected _name: string;
  protected _db: Database;

  /**
   * @internal
   * @hidden
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
   * See also {@link Database.analyzer}.
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
    } catch (err) {
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
  get(): Promise<ArangoResponseMetadata & AnalyzerDescription> {
    return this._db.request(
      { path: `/_api/analyzer/${this.name}` },
      (res) => res.body
    );
  }

  /**
   * Creates a new Analyzer with the given `options` and the instance's name.
   *
   * See also {@link Database.createAnalyzer}.
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
  create(options: CreateAnalyzerOptions): Promise<AnalyzerDescription> {
    return this._db.request(
      {
        method: "POST",
        path: "/_api/analyzer",
        body: { name: this.name, ...options },
      },
      (res) => res.body
    );
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
  drop(
    force: boolean = false
  ): Promise<ArangoResponseMetadata & { name: string }> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/analyzer/${this.name}`,
        qs: { force },
      },
      (res) => res.body
    );
  }
}
