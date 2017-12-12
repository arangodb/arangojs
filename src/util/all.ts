import { Errback } from "./types";

export type StepFn<T> = (cb: Errback<T>) => void;

export function all<T>(arr: StepFn<T>[], callback: Errback<T[]>): void {
  const result: T[] = [];
  let pending = arr.length;
  let called = false;

  if (arr.length === 0) return callback(null, result);

  const step = (i: number) => (err: Error | null, res?: T) => {
    pending -= 1;
    if (!err) result[i] = res!;
    if (!called) {
      if (err) callback(err);
      else if (pending === 0) {
        if (result.every(r => r === undefined)) callback(null);
        else callback(null, result);
      } else return;
      called = true;
    }
  };

  arr.forEach((fn, i) => fn(step(i)));
}
