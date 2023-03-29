export function querystringify(obj: Record<string, any>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (!Array.isArray(value)) {
      params.append(key, value);
    } else {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }
  return String(params);
}
