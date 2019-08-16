export type Errback<T> = (err: Error | null, result?: T) => void;

// The following types are based on the official @arangodb types

export type KeyGeneratorType = "traditional" | "autoincrement";

export interface CollectionChecksum {
  checksum: string;
  revision: string;
}

export interface CollectionFigures {
  alive: {
    count: number;
    size: number;
  };
  dead: {
    count: number;
    size: number;
    deletion: number;
  };
  datafiles: {
    count: number;
    fileSize: number;
  };
  journals: {
    count: number;
    fileSize: number;
  };
  compactors: {
    count: number;
    fileSize: number;
  };
  shapefiles: {
    count: number;
    fileSize: number;
  };
  shapes: {
    count: number;
    size: number;
  };
  attributes: {
    count: number;
    size: number;
  };
  indexes: {
    count: number;
    size: number;
  };
  lastTick: number;
  uncollectedLogfileEntries: number;
  documentReferences: number;
  waitingFor: string;
  compactionStatus: {
    time: string;
    message: string;
    count: number;
    filesCombined: number;
    bytesRead: number;
    bytesWritten: number;
  };
}

export interface CollectionPropertiesOptions {
  waitForSync?: boolean;
  journalSize?: number;
  indexBuckets?: number;
  replicationFactor?: number;
  minReplicationFactor?: number;
}

export interface CreateCollectionQueryOptions {
  waitForSyncReplication?: boolean;
  enforceReplicationFactor?: boolean;
}

export interface CreateCollectionOptions {
  waitForSync?: boolean;
  journalSize?: number;
  isVolatile?: boolean;
  isSystem?: boolean;
  keyOptions?: {
    type?: KeyGeneratorType;
    allowUserKeys?: boolean;
    increment?: number;
    offset?: number;
  };
  numberOfShards?: number;
  shardKeys?: string[];
  distributeShardsLike?: string;
  shardingStrategy?: string;
  smartJoinAttribute?: string;
  replicationFactor?: number;
  minReplicationFactor?: number;
}

export interface CollectionProperties {
  waitForSync: boolean;
  journalSize: number;
  isSystem: boolean;
  isVolatile: boolean;
  keyOptions?: {
    type: KeyGeneratorType;
    allowUserKeys: boolean;
    increment?: number;
    offset?: number;
  };
  indexBuckets: number;
  numberOfShards?: number;
  shardKeys?: string[];
  distributeShardsLike?: string;
  shardingStrategy?: string;
  smartJoinAttribute?: string;
  replicationFactor?: number;
  minReplicationFactor?: number;
}

// Document

export type Patch<T> = { [K in keyof T]?: T[K] | Patch<T[K]> };

export interface DocumentMetadata {
  _key: string;
  _id: string;
  _rev: string;
}

export interface UpdateMetadata extends DocumentMetadata {
  _oldRev: string;
}

export type Document<T extends object = any> = { [K in keyof T]: T[K] } &
  DocumentMetadata & { _from?: string; _to?: string } & {
    [key: string]: any;
  };
export type DocumentData<T extends object = any> = { [K in keyof T]: T[K] } &
  Partial<DocumentMetadata>;
export type Edge<T extends object = any> = Document<T> & {
  _from: string;
  _to: string;
};

export interface InsertOptions {
  waitForSync?: boolean;
  silent?: boolean;
  returnNew?: boolean;
}

export interface ReplaceOptions extends InsertOptions {
  rev?: string;
  overwrite?: boolean;
  returnOld?: boolean;
}

export interface UpdateOptions extends ReplaceOptions {
  keepNull?: boolean;
  mergeObjects?: boolean;
}

export interface UpdateByExampleOptions {
  keepNull?: boolean;
  waitForSync?: boolean;
  limit?: number;
  mergeObjects?: boolean;
}

export interface RemoveOptions {
  rev?: string;
  waitForSync?: boolean;
  overwrite?: boolean;
  returnOld?: boolean;
  silent?: boolean;
}

export interface RemoveByExampleOptions {
  waitForSync?: boolean;
  limit?: number;
}
