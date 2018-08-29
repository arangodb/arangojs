import { ArangoCollection, isArangoCollection } from "./collection";

export interface AqlQuery {
  query: string;
  bindVars: { [key: string]: any };
}

export interface GeneratedAqlQuery extends AqlQuery {
  _source: () => { strings: string[]; args: AqlValue[] };
}

export interface AqlLiteral {
  toAQL: () => string;
}

export type AqlValue =
  | string
  | number
  | boolean
  | ArangoCollection
  | GeneratedAqlQuery
  | AqlLiteral;

export function isAqlQuery(query: any): query is AqlQuery {
  return Boolean(query && query.query && query.bindVars);
}

export function isGeneratedAqlQuery(query: any): query is GeneratedAqlQuery {
  return isAqlQuery(query) && typeof (query as any)._source === "function";
}

export function isAqlLiteral(literal: any): literal is AqlLiteral {
  return Boolean(literal && typeof literal.toAQL === "function");
}

export function aql(
  templateStrings: TemplateStringsArray,
  ...args: AqlValue[]
): GeneratedAqlQuery {
  const strings = [...templateStrings];
  const bindVars: AqlQuery["bindVars"] = {};
  const bindVals = [];
  let query = strings[0];
  for (let i = 0; i < args.length; i++) {
    const rawValue = args[i];
    let value = rawValue;
    if (isGeneratedAqlQuery(rawValue)) {
      const src = rawValue._source();
      if (src.args.length) {
        query += src.strings[0];
        args.splice(i, 1, ...src.args);
        strings.splice(
          i,
          2,
          strings[i] + src.strings[0],
          ...src.strings.slice(1, src.args.length),
          src.strings[src.args.length] + strings[i + 1]
        );
      } else {
        query += rawValue.query + strings[i + 1];
        args.splice(i, 1);
        strings.splice(i, 2, strings[i] + rawValue.query + strings[i + 1]);
      }
      i -= 1;
      continue;
    }
    if (isAqlLiteral(rawValue)) {
      query += `${rawValue.toAQL()}${strings[i + 1]}`;
      continue;
    }
    const index = bindVals.indexOf(rawValue);
    const isKnown = index !== -1;
    let name = `value${isKnown ? index : bindVals.length}`;
    if (isArangoCollection(rawValue)) {
      name = `@${name}`;
      value = rawValue.name;
    }
    if (!isKnown) {
      bindVals.push(rawValue);
      bindVars[name] = value;
    }
    query += `@${name}${strings[i + 1]}`;
  }
  return {
    query,
    bindVars,
    _source: () => ({ strings, args })
  };
}

export namespace aql {
  export const literal = (value: any): AqlLiteral => ({
    toAQL() {
      return String(value);
    }
  });
}
