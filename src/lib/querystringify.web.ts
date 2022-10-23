export function querystringify(
  obj: Record<
    string,
    | string
    | number
    | boolean
    | null
    | undefined
    | readonly (string | number | boolean | null | undefined)[]
  >
) {
  let result = "";
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    key = encodeURIComponent(key);
    if (!Array.isArray(value)) {
      if (value === null) value = "";
      else value = encodeURIComponent(String(value));
      result += `&${key}=${value}`;
    } else {
      for (let item of value) {
        if (item == null) item = "";
        else item = encodeURIComponent(String(item));
        result += `&${key}=${item}`;
      }
    }
  }
  return result.slice(1);
}
