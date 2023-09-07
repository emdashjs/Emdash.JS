import {
  Awaiterable,
  DataChangeRequest,
  DataDriver,
  DataImageRequest,
  DataImageResponse,
  DataManyResponse,
  DataRecord,
  DataRequest,
  DataResponse,
  DataSingleResponse,
  DataSource,
  DataStats,
} from "./DataSource.ts";

export class DenoKvSource
  extends DataSource<Promise<Deno.Kv>, typeof DRIVER_TYPE> {
  #driver: DenoKvDriver;
  constructor(connection: `${typeof DRIVER_TYPE}://${string}`) {
    super(connection);
    if (this.options.type !== DRIVER_TYPE) {
      throw new TypeError("Not a Deno KV data source");
    }
    const { options } = this.options;
    const kv_path = options.trim();
    if (kv_path === ":memory:" || (!kv_path.includes(":") && kv_path !== "")) {
      const path = kv_path === ":memory:" ? kv_path : `./${kv_path}`;
      this.#driver = new DenoKvDriver(Deno.openKv(path), this.options.type);
      Deno.env.set("KV_PATH", path);
    } else {
      this.#driver = new DenoKvDriver(Deno.openKv(), this.options.type);
      Deno.env.delete("KV_PATH");
    }
  }
  get driver(): DenoKvDriver {
    return this.#driver;
  }
}

class DenoKvDriver extends DataDriver<Promise<Deno.Kv>, typeof DRIVER_TYPE> {
  #kv_stats = "kv_stats" as const;
  #kv_counts = "kv_counts" as const;
  #kv_collections = "kv_collections" as const;

  #denoKvKey({ collection, id, complexId }: DataRequest): string[] {
    if (typeof complexId === "string") {
      return [collection, id, complexId];
    }
    return [collection, id];
  }

  async #denoKvCounter(key: string[]) {
    const kv = await this.connection;
    const atomic = kv.atomic();
    const result = await atomic
      .check({ key, versionstamp: null })
      // Increment counters if not exist
      .sum([this.#kv_stats, this.#kv_counts], 1n)
      .sum([this.#kv_stats, this.#kv_counts, key[0]], 1n)
      .commit();
    return result.ok ? 1n : 0n;
  }

  async #denoKvDecrement(
    collection: string,
    decrement: number | bigint,
    atomic?: Deno.AtomicOperation,
  ) {
    atomic = atomic ?? (await this.connection).atomic();
    decrement = BigInt(decrement);
    const globalKey = [this.#kv_stats, this.#kv_counts];
    const collectionKey = [this.#kv_stats, this.#kv_counts, collection];
    const globalCount = await this.#denoKvGetCount();
    const colCount = await this.#denoKvGetCount(collection);
    return await atomic
      .set(globalKey, new Deno.KvU64(BigMath.max(globalCount - decrement, 0n)))
      .set(collectionKey, new Deno.KvU64(BigMath.max(colCount - decrement, 0n)))
      .commit();
  }

  async #denoKvGetCount(collection?: string) {
    const kv = await this.connection;
    const result = collection
      ? await kv.get<Deno.KvU64>([this.#kv_stats, this.#kv_counts, collection])
      : await kv.get<Deno.KvU64>([this.#kv_stats, this.#kv_counts]);
    return result.value ? result.value.value : 0n;
  }

  async *#denoKvGetMany(key: string[]) {
    const kv = await this.connection;
    const results = kv.list<DataRecord>({ prefix: key });
    for await (const result of results) {
      yield result.value;
    }
  }

  async create(collection: string): Promise<void> {
    const kv = await this.connection;
    const key = [this.#kv_stats, this.#kv_collections];
    const { value } = await kv.get<string[]>(key);
    const collections = new Set(value ?? []);
    collections.add(collection);
    await kv.set(key, Array.from(collections));
  }

  async createMany(collections: string[]): Promise<void> {
    const kv = await this.connection;
    const key = [this.#kv_stats, this.#kv_collections];
    const { value } = await kv.get<string[]>(key);
    const set = new Set([...(value ?? []), ...collections]);
    await kv.set(key, Array.from(set));
  }

  async delete(request: DataRequest): Promise<DataResponse> {
    const op = crypto.randomUUID();
    try {
      const kv = await this.connection;
      const key = this.#denoKvKey(request);
      const result = await kv.get(key);
      if (result.versionstamp) {
        const atomic = kv.atomic();
        atomic.delete(key);
        await this.#denoKvDecrement(request.collection, 1n, atomic);
        return {
          op,
          success: true,
        };
      }
    } catch (cause) {
      return {
        op,
        success: false,
        errors: [{
          cause,
          message: cause?.message ??
            "DELETE  operation failed; see error.cause for more information.",
        }],
      };
    }
    return {
      op,
      success: false,
    };
  }

  async deleteMany(requests: Awaiterable<DataRequest>): Promise<DataResponse> {
    const op = crypto.randomUUID();
    let collection: string | undefined;
    let count = 0n;
    try {
      const kv = await this.connection;
      const atomic = kv.atomic();
      for await (const request of requests) {
        const key = this.#denoKvKey(request);
        const result = await kv.get(key);
        if (result.versionstamp) {
          atomic.delete(key);
          count += 1n;
        }
      }
      if (collection && count > 0n) {
        const result = await this.#denoKvDecrement(collection, count, atomic);
        if (!result.ok) {
          return {
            op,
            success: false,
            errors: [{
              message: `SET transaction for ${collection} failed.`,
            }],
          };
        } else {
          return {
            op,
            success: true,
          };
        }
      }
    } catch (cause) {
      return {
        op,
        success: false,
        errors: [{
          cause,
          message: cause?.message ??
            `DELETE transaction for ${collection} failed; see error.cause for more information.`,
        }],
      };
    }
    return {
      op,
      success: false,
    };
  }

  async get(request: DataRequest): Promise<DataSingleResponse> {
    const op = crypto.randomUUID();
    const kv = await this.connection;
    const key = this.#denoKvKey(request);
    const result = await kv.get<DataRecord>(key);
    if (result.value) {
      return {
        op,
        success: true,
        record: result.value,
      };
    }
    return {
      op,
      success: false,
      record: null,
    };
  }

  getMany(request: DataRequest): DataManyResponse {
    return {
      op: crypto.randomUUID(),
      success: true,
      records: this.#denoKvGetMany(this.#denoKvKey(request)),
    };
  }

  getAll(collection: string): DataManyResponse {
    const conn = this.connection;
    async function* iterable() {
      const kv = await conn;
      const results = kv.list<DataRecord>({ prefix: [collection] });
      for await (const result of results) {
        yield result.value;
      }
    }
    return {
      op: crypto.randomUUID(),
      success: true,
      records: iterable(),
    };
  }

  async readImage(request: DataRequest): Promise<DataImageResponse> {
    const op = crypto.randomUUID();
    const kv = await this.connection;
    const key = this.#denoKvKey(request);
    const result = await kv.get<Uint8Array>(key);
    if (result.value) {
      return {
        op,
        success: true,
        value: result.value,
      };
    }
    return {
      op,
      success: false,
      value: new Uint8Array(0),
    };
  }

  async saveImage(request: DataImageRequest): Promise<DataResponse> {
    const op = crypto.randomUUID();
    const kv = await this.connection;
    const key = this.#denoKvKey(request);
    await this.#denoKvCounter(key);
    const result = await kv.set(key, await request.value);
    return {
      op,
      success: result.ok,
    };
  }

  async set(request: DataChangeRequest): Promise<DataResponse> {
    const op = crypto.randomUUID();
    try {
      const kv = await this.connection;
      const key = this.#denoKvKey(request);
      await this.#denoKvCounter(key);
      const result = await kv.set(key, request.record);
      return {
        op,
        success: result.ok,
      };
    } catch (cause) {
      return {
        op,
        success: false,
        errors: [{
          cause,
          message: cause?.message ??
            "SET operation failed; see error.cause for more information.",
        }],
      };
    }
  }

  async setMany(
    requests: Awaiterable<DataChangeRequest>,
  ): Promise<DataResponse> {
    const op = crypto.randomUUID();
    let collection: string | undefined;
    let count = 0n;
    try {
      const kv = await this.connection;
      const atomic = kv.atomic();
      for await (const request of requests) {
        const key = this.#denoKvKey(request);
        count += await this.#denoKvCounter(key);
        atomic.set(key, request.record);
      }
      if (collection) {
        const result = await atomic.commit();
        if (!result.ok) {
          if (count > 0n) {
            await this.#denoKvDecrement(collection, count);
          }
          return {
            op,
            success: false,
            errors: [{
              message: `SET transaction for ${collection} failed.`,
            }],
          };
        }
      }
    } catch (cause) {
      if (collection && count > 0n) {
        await this.#denoKvDecrement(collection, count);
      }
      return {
        op,
        success: false,
        errors: [{
          cause,
          message:
            `SET transaction for ${collection} failed; see error.cause for more information.`,
        }],
      };
    }
    return {
      op,
      success: true,
    };
  }

  async stats(
    collection?: string | undefined,
  ): Promise<DataStats<typeof DRIVER_TYPE>> {
    const op = crypto.randomUUID();
    const kv = await this.connection;
    if (collection) {
      return {
        op,
        collectionCount: 1,
        collections: [collection],
        recordCount: Number(await this.#denoKvGetCount(collection)),
        success: true,
        type: DRIVER_TYPE,
      };
    }
    const { value } = await kv.get<string[]>([
      this.#kv_stats,
      this.#kv_collections,
    ]);
    return {
      op,
      collectionCount: value?.length ?? 0,
      collections: value ?? [],
      recordCount: Number(await this.#denoKvGetCount()),
      success: true,
      type: DRIVER_TYPE,
    };
  }
}

const DRIVER_TYPE = "denokv" as const;
const BigMath = {
  min(...bigints: [bigint, ...bigint[]]): bigint {
    if (bigints.length < 1) {
      throw new TypeError("Must provide at least 1 bigint.");
    }
    let min = bigints[0];
    for (let int of bigints) {
      if (typeof int === "number") {
        int = BigInt(int);
      }
      if (int < min) {
        min = int;
      }
    }
    return min;
  },
  max(...bigints: [bigint, ...bigint[]]): bigint {
    if (bigints.length < 1) {
      throw new TypeError("Must provide at least 1 bigint.");
    }
    let max = bigints[0];
    for (let int of bigints) {
      if (typeof int === "number") {
        int = BigInt(int);
      }
      if (int > max) {
        max = int;
      }
    }
    return max;
  },
};
