import { database } from "./database.ts";
import type { BasicKvRecord, JsonLike, Mutable } from "./types.ts";

export abstract class KvRecord<T extends string = "none">
  implements BasicKvRecord {
  id: string;
  type: T;
  created: Date;
  modified: Date;
  #hydrated: boolean;
  // deno-lint-ignore no-explicit-any
  abstract internal?: Record<string, any>;

  constructor(record?: Partial<KvRecord<T>>) {
    this.id = record?.id ?? crypto.randomUUID();
    this.type = record?.type ?? "none" as T;
    this.created = record?.created ?? new Date();
    this.modified = record?.modified ?? this.created;
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
    this.modified = new Date();
    const result = await kv.set([this.type, this.id], this);
    return result.ok ?? false;
  }

  async delete(): Promise<boolean> {
    const kv = await database();
    await kv.delete([this.type, this.id]);
    return true;
  }

  toPublic(): Mutable<typeof this, "internal" | "hydrated"> {
    const pub = { ...this };
    delete pub.internal;
    return pub;
  }

  toJSON() {
    return this.toPublic();
  }

  static likeJSON<T extends KvRecord<string>>(input: JsonLike<T>) {
    return {
      ...input,
      created: new Date(input.created),
      modified: new Date(input.modified),
    };
  }
}
