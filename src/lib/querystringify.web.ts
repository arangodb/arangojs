import { ParsedUrlQueryInput } from "querystring";

export function querystringify(obj: ParsedUrlQueryInput) {
  const result = [] as string[];
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    key = encodeURIComponent(key);
    if (!Array.isArray(value)) {
      if (value === null) value = "";
      else value = encodeURIComponent(String(value));
      result.push(`${key}=${value}`);
    } else {
      for (let item of value) {
        if (item === undefined) continue;
        if (item === null) item = "";
        else item = encodeURIComponent(String(item));
        result.push(`${key}=${item}`);
      }
    }
  }
  return result.join(`&`);
}
