import type { Precise } from "../types.ts";
import {
  ActiveCollection,
  type ActiveModel,
  type ActiveRecord,
  type CollectionName,
} from "./ActiveRecord.ts";
import type { DataSource } from "./DataSource.ts";
import { DenoKvSource } from "./DenoKvSource.ts";

export class Database<
  Models extends readonly ActiveModel[] = [],
  Protocol extends Precise.String = Precise.String,
> {
  source: DataSource;
  collections = {} as CollectionMap<Models[number]>;

  constructor(init?: DatabaseInit<Models, Protocol>) {
    if (init?.connectionString) {
      // TODO: For now, denokv is the only connection string implemented <shrug>; force it.
      // deno-lint-ignore no-explicit-any
      this.source = new DenoKvSource(init.connectionString as any);
    } else {
      this.source = new DenoKvSource("denokv://<DEFAULT>");
    }
    const collections = this.collections as Record<string, unknown>;
    for (const model of init?.models ?? []) {
      const collection = new ActiveCollection(model, this.source);
      collections[collection.name] = collection;
    }
  }

  async create(): Promise<this> {
    // TODO: SQL adapter will need more than just createMany for the database.
    await this.source.driver.createMany(Object.keys(this.collections));
    return this;
  }

  getCollection<T extends CollectionName<Models[number]>>(
    name: T,
  ): typeof this.collections[T] {
    return this.collections[name];
  }

  addCollection<T extends ActiveModel>(
    model: T,
  ): Database<[T, ...Models], Protocol> {
    const collections = this.collections as Record<string, unknown>;
    const collection = new ActiveCollection(model, this.source);
    collections[collection.name] = collection;
    return this as unknown as Database<[T, ...Models], Protocol>;
  }
}

export type DatabaseInit<
  Models extends readonly ActiveModel[] | undefined,
  Protocol extends Precise.String = "denokv",
> = {
  connectionString?: `${Protocol}://${string}`;
  models?: Models;
};

type CollectionMap<Model extends ActiveModel | ActiveRecord> = {
  [Name in CollectionName<Model>]: ActiveCollection<ExtractRecord<Model, Name>>;
};
type ExtractRecord<
  M extends ActiveModel | ActiveRecord,
  N extends Precise.String,
> =
  // deno-lint-ignore no-explicit-any
  | InstanceType<Extract<M, new (...args: any[]) => { collection: N }>>
  | Extract<M, { collection: N }>;
