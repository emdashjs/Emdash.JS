import type { Precise } from "../types.ts";

export abstract class DataSource<
  Type = Precise.Value,
  Protocol extends Precise.String = Precise.String,
> {
  options: Readonly<DataSourceOptions<Protocol>>;

  constructor(connection: `${Protocol}://${string}`) {
    const [type, options] = connection.split("://");
    this.options = Object.freeze({
      connection,
      options,
      type: type as Protocol,
    });
  }

  abstract get driver(): DataDriver<Type, Protocol>;
}

export interface DataSourceOptions<Protocol extends Precise.String> {
  connection: `${Protocol}://${string}`;
  options: string;
  type: Protocol;
}

export abstract class DataDriver<Type, Protocol extends Precise.String> {
  proto: Protocol;
  /** The raw connection instance of the data source; used by the methods of the driver. */
  connection: Type;
  constructor(connection: Type, proto: Protocol) {
    this.connection = connection;
    this.proto = proto;
  }

  abstract create(collection: string): Promise<void>;
  abstract createMany(collections: string[]): Promise<void>;
  abstract delete(request: DataRequest): Promise<DataResponse>;
  abstract deleteMany(
    requests: Awaiterable<DataRequest>,
  ): Promise<DataResponse>;
  abstract get(request: DataRequest): Promise<DataSingleResponse>;
  abstract getMany(request: DataRequest): DataManyResponse;
  abstract readImage(request: DataRequest): Promise<DataImageResponse>;
  abstract saveImage(request: DataImageRequest): Promise<DataResponse>;
  abstract set(request: DataChangeRequest): Promise<DataResponse>;
  abstract setMany(
    requests: Awaiterable<DataChangeRequest>,
  ): Promise<DataResponse>;
  abstract stats(collection?: string): Promise<DataStats<Protocol>>;
}

export type Awaiterable<T> =
  | T[]
  | Iterable<T>
  | Promise<T>[]
  | AsyncIterable<T>;

export type Promised<T> = Promise<T> | T;

/** An object formatted for use by the orm. */
export type DataRecord<T = Precise.Value> = {
  [P: string]: unknown;
  [P: number]: unknown;
} & {
  created: string;
  modified: string;
} & T;

export interface DataResponse {
  /** The uuid of the data operation. */
  op: string;
  /** Indicator of success. */
  success: boolean;
  /** Errors, if any. */
  errors?: DataError[];
}

export interface DataRequest {
  /** Represents a real or synthetic collection of records; for example, this could be a partition, a table, or a collection. */
  collection: string;
  /** Represents a real or synthetic key for indexing or partitioning, dependent on data source implementation. */
  id: string;
  /** Represents a real index key if the primary key is synthetic, dependent on data source implementation. */
  complexId?: string;
}

export interface DataChangeRequest extends DataRequest {
  /** A formatted record for creating or updating to a data source. */
  record: DataRecord;
}

export interface DataImageRequest extends DataRequest {
  /** The image bytes for creating or updating to a data source. */
  value: Promised<Uint8Array>;
}

export interface DataError {
  /** The cause of an error, if any. */
  cause?: Error;
  /** The message of the error; required for synthetic error responses. */
  message: string;
}

export interface DataSingleResponse extends DataResponse {
  /** The formatted object record returned from the data source, or null if not found. */
  record: DataRecord | null;
}

export interface DataManyResponse extends DataResponse {
  /** The awaitable iterable containing the many record response. */
  records: Awaiterable<DataRecord>;
}

export interface DataImageResponse extends DataResponse {
  /** A promise resolving the bytes returned from the data source. */
  value: Promised<Uint8Array>;
}

export interface DataStats<Protocol extends Precise.String = Precise.String>
  extends DataResponse {
  /** The type of the collection; should match the type of the data source options. */
  type: Protocol;
  /** If provided, a connection string for the data source. */
  connectionString?: `${Protocol}://${string}`;
  /** The number of records in the data source, or in the collection if specified. */
  recordCount: number;
  /** The number of collections in the data source, or 1 for a single collection, or 0 if no collection exists. */
  collectionCount: number;
  /** The collection names defined in the data source. */
  collections: string[];
}
