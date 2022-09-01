/**
 * Utility function for omitting properties by key.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function omit<T extends {}>(obj: T, keys: (keyof T)[]): T {
  const result = {} as T;
  for (const key of Object.keys(obj)) {
    if (keys.includes(key as keyof T)) continue;
    result[key as keyof T] = obj[key as keyof T];
  }
  return result;
}
