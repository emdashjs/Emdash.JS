import { database } from "./database.ts";
import type { BasicKvRecord, Mutable } from "./types.ts";

export abstract class KvRecord<T extends string = "none">
  implements BasicKvRecord {
  id: string;
  type: T;
  hydrated?: boolean;
  // deno-lint-ignore no-explicit-any
  abstract internal?: Record<string, any>;

  constructor(record?: Partial<KvRecord<T>>) {
    this.id = record?.id ?? crypto.randomUUID();
    this.type = record?.type ?? "none" as T;
    this.hydrated = false;
  }

  async get(): Promise<boolean> {
    const kv = await database();
    const result = await kv.get<KvRecord<T>>([this.type, this.id]);
    if (result.value !== null) {
      Object.assign(this, result.value);
      this.hydrated = true;
      return true;
    }
    return false;
  }

  async set(): Promise<boolean> {
    const kv = await database();
    const result = await kv.set([this.type, this.id], this);
    return result.ok ?? false;
  }

  toPublic(): Mutable<typeof this, "internal"> {
    const pub = { ...this };
    delete pub.internal;
    return pub;
  }

  toJSON() {
    return this.toPublic();
  }
}
