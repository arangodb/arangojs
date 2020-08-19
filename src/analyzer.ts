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
  | TextAnalyzerInfo;

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
