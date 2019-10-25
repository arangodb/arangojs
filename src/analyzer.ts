import { Connection } from "./connection";
import { isArangoError } from "./error";

export interface ArangoAnalyzer {
  isArangoAnalyzer: true;
  name: string;
}

export type AnalyzerDescription = AnalyzerInfo & {
  name: string;
  features: string[];
};

export type CreateAnalyzerOptions = AnalyzerInfo & {
  features?: string[];
};

export type AnalyzerInfo =
  | IdentityAnalyzerInfo
  | DelimiterAnalyzerInfo
  | StemAnalyzerInfo
  | NormAnalyzerInfo
  | NgramAnalyzerInfo
  | TextAnalyzerInfo;

export type IdentityAnalyzerInfo = {
  type: "identity";
  properties?: null;
};

export type DelimiterAnalyzerInfo = {
  type: "delimiter";
  properties: string | { delimiter: string };
};

export type StemAnalyzerInfo = {
  type: "stem";
  properties: { locale: string };
};

export type NormAnalyzerInfo = {
  type: "norm";
  properties: {
    locale: string;
    case?: "lower" | "none" | "upper";
    accent?: boolean;
  };
};

export type NgramAnalyzerInfo = {
  type: "ngram";
  properties: {
    max: number;
    min: number;
    preserveOriginal: boolean;
  };
};

export type TextAnalyzerInfo = {
  type: "text";
  properties: {
    locale: string;
    case?: "lower" | "none" | "upper";
    stopwords?: string[];
    stopwordsPath?: string;
    accent?: boolean;
    stemming?: boolean;
  };
};

const ANALYZER_NOT_FOUND = 1202;
export class Analyzer implements ArangoAnalyzer {
  isArangoAnalyzer: true = true;
  name: string;
  protected _connection: Connection;

  constructor(connection: Connection, name: string) {
    this._connection = connection;
    this.name = name;
  }

  get(): Promise<AnalyzerDescription> {
    return this._connection.request(
      { path: `/_api/analyzer/${this.name}` },
      res => res.body
    );
  }

  async exists() {
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

  create(options: CreateAnalyzerOptions): Promise<AnalyzerDescription> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/analyzer",
        body: { name: this.name, ...options }
      },
      res => res.body
    );
  }

  drop(force?: boolean): Promise<{ name: string }> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/analyzer/${this.name}`,
        qs: { force }
      },
      res => res.body
    );
  }
}
