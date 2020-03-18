import { ConnectionOptions } from "./connection";

export type Config =
  | string
  | string[]
  | (ConnectionOptions & { databaseName?: string });
