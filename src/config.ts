import { ConnectionOptions } from "./connection";

export interface Config extends ConnectionOptions {
  /**
    Default: `_system`

    Name of the initial database.
   */
  databaseName?: string;
}
