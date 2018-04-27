export type AqlQuery = {
  query: string;
  bindVars: { [key: string]: any };
};

export type AqlLiteral = {
  toAQL: () => string;
};

export function isAqlQuery(query: any): query is AqlQuery {
  return Boolean(query && query.query && query.bindVars);
}

export function isAqlLiteral(literal: any): literal is AqlLiteral {
  return Boolean(literal && typeof literal.toAQL === "function");
}

export function aql(strings: TemplateStringsArray, ...args: any[]): AqlQuery {
  const bindVars: AqlQuery["bindVars"] = {};
  const bindVals = [];
  let query = strings[0];
  for (let i = 0; i < args.length; i++) {
    const rawValue = args[i];
    let value = rawValue;
    if (rawValue && typeof rawValue.toAQL === "function") {
      query += `${rawValue.toAQL()}${strings[i + 1]}`;
      continue;
    }
    const index = bindVals.indexOf(rawValue);
    const isKnown = index !== -1;
    let name = `value${isKnown ? index : bindVals.length}`;
    if (rawValue && rawValue.isArangoCollection) {
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

aql.literal = (value: any) => ({toAQL () {return value;}});
