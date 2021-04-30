import { ParsedUrlQueryInput, stringify } from "querystring";

function clean<T>(obj: T) {
  const result = {} as typeof obj;
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if (value === undefined) continue;
    (result as any)[key] = value;
  }
  return result;
}

export function querystringify(obj: ParsedUrlQueryInput) {
  return stringify(clean(obj));
}
