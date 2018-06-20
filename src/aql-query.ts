import { ArangoCollection, isArangoCollection } from "./collection";

export interface AqlQuery {
  query: string;
  bindVars: { [key: string]: any };
}

export interface AqlLiteral {
  toAQL: () => string;
}

export type AqlValue =
  | string
  | number
  | boolean
  | ArangoCollection
  | AqlLiteral;

export function isAqlQuery(query: any): query is AqlQuery {
  return Boolean(query && query.query && query.bindVars);
}

export function isAqlLiteral(literal: any): literal is AqlLiteral {
  return Boolean(literal && typeof literal.toAQL === "function");
}

export function aql(
  strings: TemplateStringsArray,
  ...args: AqlValue[]
): AqlQuery {
  const bindVars: AqlQuery["bindVars"] = {};
  const bindVals = [];
  let query = strings[0];
  for (let i = 0; i < args.length; i++) {
    const rawValue = args[i];
    let value = rawValue;
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
  return { query, bindVars };
}

export namespace aql {
  export const literal = (value: any): AqlLiteral => ({
    toAQL() {
      return String(value);
    }
  });
}
