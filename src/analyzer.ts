import { Connection } from "./connection";

export type AnalyzerDescription = AnyAnalyzer & {
  name: string;
  features: string[];
};

export type CreateAnalyzerOptions = AnyAnalyzer & {
  features?: string[];
};

export type AnyAnalyzer =
  | IdentityAnalyzer
  | DelimiterAnalyzer
  | StemAnalyzer
  | NormAnalyzer
  | NgramAnalyzer
  | TextAnalyzer;

export interface IdentityAnalyzer {
  type: "identity";
  properties?: null;
}

export interface DelimiterAnalyzer {
  type: "delimiter";
  properties: string | { delimiter: string };
}

export interface StemAnalyzer {
  type: "stem";
  properties: { locale: string };
}

export interface NormAnalyzer {
  type: "norm";
  properties: {
    locale: string;
    case?: "lower" | "none" | "upper";
    accent?: boolean;
  };
}

export interface NgramAnalyzer {
  type: "ngram";
  properties: { max: number; min: number; preserveOriginal: boolean };
}

export interface TextAnalyzer {
  type: "text";
  properties: {
    locale: string;
    case?: "lower" | "none" | "upper";
    stopwords?: string[];
    stopwordsPath?: string;
    accent?: boolean;
    stemming?: boolean;
  };
}

export class ArangoAnalyzer {
  private _connection: Connection;

  isArangoAnalyzer = true;
  name: string;

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
