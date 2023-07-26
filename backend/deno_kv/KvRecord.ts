import { countBigInt, database } from "./database.ts";
import { APP_COLLECTION } from "../constants.ts";
import type { BasicKvRecord, JsonLike, Mutable } from "./types.ts";

/** Helper for making base props optional for JsonLike. */
export type KvJsonPartial = "id" | "type" | "created" | "modified";
/** Helper for excluding base props when typing JsonLike. */
export type KvJsonExclude = Exclude<
  keyof JsonLike<KvRecord>,
  KvJsonPartial | undefined
>;
export type KvCollection = typeof APP_COLLECTION[keyof typeof APP_COLLECTION];
export type KvRecordJson = JsonLike<
  KvRecord<KvCollection>,
  KvJsonExclude,
  KvJsonPartial
>;

export abstract class KvRecord<T extends KvCollection = "none">
  implements BasicKvRecord {
  id: string;
  type: T;
  created: Date;
  modified: Date;
  #hydrated: boolean;
  // deno-lint-ignore no-explicit-any
  abstract internal?: Record<string, any>;

  constructor(record?: Partial<KvRecord<T>> | KvRecordJson) {
    this.id = record?.id ?? crypto.randomUUID();
    this.type = record?.type as T ?? "none" as T;
    this.created = record?.created ? new Date(record.created) : new Date();
    this.modified = record?.modified ? new Date(record.modified) : this.created;
    this.#hydrated = false;
  }

  get hydrated(): boolean {
    return this.#hydrated;
  }

  async get(): Promise<boolean> {
    const kv = await database();
    const result = await kv.get<KvRecord<T>>([this.type, this.id]);
    if (result.value !== null) {
      Object.assign(this, result.value);
      this.#hydrated = true;
      return true;
    }
    return false;
  }

  async set(): Promise<boolean> {
    const kv = await database();
    const key = [this.type, this.id];
    this.modified = new Date();
    const atomic = kv.atomic();
    await atomic
      .check({ key, versionstamp: null })
      // Increment counter if not exist
      .sum([APP_COLLECTION.COUNT, this.type], 1n)
      .commit();
    const result = await kv.set([this.type, this.id], this);
    return result.ok ?? false;
  }

  async delete(): Promise<boolean> {
    const kv = await database();
    const key = [this.type, this.id];
    const result = await kv.get<KvRecord<T>>(key);
    // Delete and decrement counter if exist
    if (result.versionstamp) {
      const count = await countBigInt(this.type);
      let newCount = count - 1n;
      newCount = newCount < 0n ? 0n : newCount;
      const atomic = kv.atomic();
      await atomic
        .delete(key)
        .set([APP_COLLECTION.COUNT, this.type], new Deno.KvU64(newCount))
        .commit();
      return true;
    }
    return false;
  }

  toPublic(): Mutable<typeof this, "internal" | "hydrated"> {
    const pub = { ...this };
    delete pub.internal;
    return pub;
  }

  toJSON() {
    return this.toPublic();
  }
}
