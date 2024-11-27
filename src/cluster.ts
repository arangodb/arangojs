/**
 * ```ts
 * import type { ClusterImbalanceInfo } from "arangojs/cluster";
 * ```
 *
 * The "cluster" module provides types for cluster management.
 *
 * @packageDocumentation
 */

//#region Cluster operation options
/**
 * Options for rebalancing the cluster.
 */
export type ClusterRebalanceOptions = {
  /**
   * Maximum number of moves to be computed.
   *
   * Default: `1000`
   */
  maximumNumberOfMoves?: number;
  /**
   * Allow leader changes without moving data.
   *
   * Default: `true`
   */
  leaderChanges?: boolean;
  /**
   * Allow moving leaders.
   *
   * Default: `false`
   */
  moveLeaders?: boolean;
  /**
   * Allow moving followers.
   *
   * Default: `false`
   */
  moveFollowers?: boolean;
  /**
   * Ignore system collections in the rebalance plan.
   *
   * Default: `false`
   */
  excludeSystemCollections?: boolean;
  /**
   * Default: `256**6`
   */
  piFactor?: number;
  /**
   * A list of database names to exclude from the analysis.
   *
   * Default: `[]`
   */
  databasesExcluded?: string[];
};
//#endregion

//#region Cluster operation results
/**
 * The result of a cluster rebalance.
 */
export type ClusterRebalanceResult = {
  /**
   * Imbalance before the suggested move shard operations are applied.
   */
  imbalanceBefore: ClusterImbalanceInfo;
  /**
   * Expected imbalance after the suggested move shard operations are applied.
   */
  imbalanceAfter: ClusterImbalanceInfo;
  /**
   * Suggested move shard operations.
   */
  moves: ClusterRebalanceMove[];
};

/**
 * Information about the current state of the cluster imbalance.
 */
export type ClusterRebalanceState = ClusterImbalanceInfo & {
  /**
   * The number of pending move shard operations.
   */
  pendingMoveShards: number;
  /**
   * The number of planned move shard operations.
   */
  todoMoveShards: number;
};

/**
 * Information about a cluster imbalance.
 */
export type ClusterImbalanceInfo = {
  /**
   * Information about the leader imbalance.
   */
  leader: {
    /**
     * The weight of leader shards per DB-Server. A leader has a weight of 1 by default but it is higher if collections can only be moved together because of `distributeShardsLike`.
     */
    weightUsed: number[];
    /**
     * The ideal weight of leader shards per DB-Server.
     */
    targetWeight: number[];
    /**
     * The number of leader shards per DB-Server.
     */
    numberShards: number[];
    /**
     * The measure of the leader shard distribution. The higher the number, the worse the distribution.
     */
    leaderDupl: number[];
    /**
     * The sum of all weights.
     */
    totalWeight: number;
    /**
     * The measure of the total imbalance. A high value indicates a high imbalance.
     */
    imbalance: number;
    /**
     * The sum of shards, counting leader shards only.
     */
    totalShards: number;
  };
  /**
   * Information about the shard imbalance.
   */
  shards: {
    /**
     * The size of shards per DB-Server.
     */
    sizeUsed: number[];
    /**
     * The ideal size of shards per DB-Server.
     */
    targetSize: number[];
    /**
     * The number of leader and follower shards per DB-Server.
     */
    numberShards: number[];
    /**
     * The sum of the sizes.
     */
    totalUsed: number;
    /**
     * The sum of shards, counting leader and follower shards.
     */
    totalShards: number;
    /**
     * The sum of system collection shards, counting leader shards only.
     */
    totalShardsFromSystemCollections: number;
    /**
     * The measure of the total imbalance. A high value indicates a high imbalance.
     */
    imbalance: number;
  };
};

export type ClusterRebalanceMove = {
  /**
   * The server name from which to move.
   */
  from: string;
  /**
   * The ID of the destination server.
   */
  to: string;
  /**
   * Shard ID of the shard to be moved.
   */
  shard: string;
  /**
   * Collection ID of the collection the shard belongs to.
   */
  collection: number;
  /**
   * True if this is a leader move shard operation.
   */
  isLeader: boolean;
};
//#endregion
