/**
 * ```ts
 * import type { VersionInfo } from "arangojs/administration";
 * ```
 *
 * The "administration" module provides types for database administration.
 *
 * @packageDocumentation
 */

/**
 * Result of retrieving database version information.
 */
export type VersionInfo = {
  /**
   * Value identifying the server type, i.e. `"arango"`.
   */
  server: string;
  /**
   * ArangoDB license type or "edition".
   */
  license: "community" | "enterprise";
  /**
   * ArangoDB server version.
   */
  version: string;
  /**
   * Additional information about the ArangoDB server.
   */
  details?: { [key: string]: string };
};

/**
 * Information about the storage engine.
 */
export type EngineInfo = {
  /**
   * Endianness of the storage engine.
   */
  endianness?: "little" | "big";
  /**
   * Name of the storage engine.
   */
  name: string;
  /**
   * Features supported by the storage engine.
   */
  supports?: {
    /**
     * Index types supported by the storage engine.
     */
    indexes?: string[];
    /**
     * Aliases supported by the storage engine.
     */
    aliases?: {
      /**
       * Index type aliases supported by the storage engine.
       */
      indexes?: Record<string, string>;
    };
  };
};

/**
 * Information about the server status.
 */
export type ServerStatusInformation = {
  /**
   * (Cluster Coordinators and DB-Servers only.) The address of the server.
   */
  address?: string;
  /**
   * (Cluster Coordinators and DB-Servers only.) Information about the Agency.
   */
  agency?: {
    /**
     * Information about the communication with the Agency.
     */
    agencyComm: {
      /**
       * A list of possible Agency endpoints.
       */
      endpoints: string[];
    };
  };
  /**
   * (Cluster Agents only.) Information about the Agents.
   */
  agent?: {
    /**
     * The endpoint of the queried Agent.
     */
    endpoint: string;
    /**
     * Server ID of the queried Agent.
     */
    id: string;
    /**
     * Server ID of the leading Agent.
     */
    leaderId: string;
    /**
     * Whether the queried Agent is the leader.
     */
    leading: boolean;
    /**
     * The current term number.
     */
    term: number;
  };
  /**
   * (Cluster Coordinators only.) Information about the Coordinators.
   */
  coordinator?: {
    /**
     * The server ID of the Coordinator that is the Foxx master.
     */
    foxxmaster: string[];
    /**
     * Whether the queried Coordinator is the Foxx master.
     */
    isFoxxmaster: boolean[];
  };
  /**
   * Whether the Foxx API is enabled.
   */
  foxxApi: boolean;
  /**
   * A host identifier defined by the HOST or NODE_NAME environment variable,
   * or a fallback value using a machine identifier or the cluster/Agency address.
   */
  host: string;
  /**
   * A hostname defined by the HOSTNAME environment variable.
   */
  hostname?: string;
  /**
   * ArangoDB Edition.
   */
  license: "community" | "enterprise";
  /**
   * Server operation mode.
   *
   * @deprecated use `operationMode` instead
   */
  mode: "server" | "console";
  /**
   * Server operation mode.
   */
  operationMode: "server" | "console";
  /**
   * The process ID of arangod.
   */
  pid: number;
  /**
   * Server type.
   */
  server: "arango";
  /**
   * Information about the server status.
   */
  serverInfo: {
    /**
     * Whether the maintenance mode is enabled.
     */
    maintenance: boolean;
    /**
     * (Cluster only.) The persisted ID.
     */
    persistedId?: string;
    /**
     * Startup and recovery information.
     */
    progress: {
      /**
       * Internal name of the feature that is currently being prepared, started, stopped or unprepared.
       */
      feature: string;
      /**
       * Name of the lifecycle phase the instance is currently in.
       */
      phase: string;
      /**
       * Current recovery sequence number value.
       */
      recoveryTick: number;
    };
    /**
     * Whether writes are disabled.
     */
    readOnly: boolean;
    /**
     * (Cluster only.) The reboot ID. Changes on every restart.
     */
    rebootId?: number;
    /**
     * Either "SINGLE", "COORDINATOR", "PRIMARY" (DB-Server), or "AGENT"
     */
    role: "SINGLE" | "COORDINATOR" | "PRIMARY" | "AGENT";
    /**
     * (Cluster Coordinators and DB-Servers only.) The server ID.
     */
    serverId?: string;
    /**
     * (Cluster Coordinators and DB-Servers only.) Either "STARTUP", "SERVING",
     * or "SHUTDOWN".
     */
    state?: "STARTUP" | "SERVING" | "SHUTDOWN";
    /**
     * The server version string.
     */
    version: string;
    /**
     * Whether writes are enabled.
     *
     * @deprecated Use `readOnly` instead.
     */
    writeOpsEnabled: boolean;
  };
};

/**
 * Server availability.
 *
 * - `"default"`: The server is operational.
 *
 * - `"readonly"`: The server is in read-only mode.
 *
 * - `false`: The server is not available.
 */
export type ServerAvailability = "default" | "readonly" | false;

/**
 * Single server deployment information for support purposes.
 */
export type SingleServerSupportInfo = {
  /**
   * ISO 8601 datetime string of when the information was requested.
   */
  date: string;
  /**
   * Information about the deployment.
   */
  deployment: {
    /**
     * Deployment mode:
     *
     * - `"single"`: A single server deployment.
     *
     * - `"cluster"`: A cluster deployment.
     */
    type: "single";
  };
};

/**
 * Cluster deployment information for support purposes.
 */
export type ClusterSupportInfo = {
  /**
   * ISO 8601 datetime string of when the information was requested.
   */
  date: string;
  /**
   * Information about the deployment.
   */
  deployment: {
    /**
     * Deployment mode:
     *
     * - `"single"`: A single server deployment.
     *
     * - `"cluster"`: A cluster deployment.
     */
    type: "cluster";
    /**
     * Information about the servers in the cluster.
     */
    servers: Record<string, Record<string, any>>;
    /**
     * Number of agents in the cluster.
     */
    agents: number;
    /**
     * Number of coordinators in the cluster.
     */
    coordinators: number;
    /**
     * Number of DB-Servers in the cluster.
     */
    dbServers: number;
    /**
     * Information about the shards in the cluster.
     */
    shards: {
      /**
       * Number of collections in the cluster.
       */
      collections: number;
      /**
       * Number of shards in the cluster.
       */
      shards: number;
      /**
       * Number of leaders in the cluster.
       */
      leaders: number;
      /**
       * Number of real leaders in the cluster.
       */
      realLeaders: number;
      /**
       * Number of followers in the cluster.
       */
      followers: number;
      /**
       * Number of servers in the cluster.
       */
      servers: number;
    };
  };
  /**
   * (Cluster only.) Information about the ArangoDB instance as well as the
   * host machine.
   */
  host: Record<string, any>;
};

/**
 * An object providing methods for accessing queue time metrics of the most
 * recently received server responses if the server supports this feature.
 */
export interface QueueTimeMetrics {
  /**
   * Returns the queue time of the most recently received response in seconds.
   */
  getLatest(): number | undefined;
  /**
   * Returns a list of the most recently received queue time values as tuples
   * of the timestamp of the response being processed in milliseconds and the
   * queue time in seconds.
   */
  getValues(): [number, number][];
  /**
   * Returns the average queue time of the most recently received responses
   * in seconds.
   */
  getAvg(): number;
}
