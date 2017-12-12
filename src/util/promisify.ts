import { Errback } from "./types";

export type Compat<T> = { callback: Errback<T>; promise?: Promise<T> };
export type Promisify<T> = (callback?: Errback<T>) => Compat<T>;

const noop = () => undefined;

export default function promisify(
  promiseClass: typeof Promise | false
): Promisify<any> {
  if (promiseClass === false) {
    return function<T>(cb?: Errback<T>) {
      return { callback: cb || noop };
    };
  }

  return function<T>(cb?: Errback<T>) {
    const PromiseImpl = promiseClass || global.Promise;

    if (cb || !PromiseImpl) {
      return { callback: cb || noop };
    }

    let callback: Errback<T> | undefined = undefined;
    const promise = new PromiseImpl<T>((resolve, reject) => {
      callback = (err, res) => {
        if (err) reject(err);
        else resolve(res!);
      };
    });

    return { callback: callback!, promise };
  };
}
