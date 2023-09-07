// deno-lint-ignore-file ban-types
import {
  ActiveCollection,
  type ActiveModel,
  type ActiveRecord,
  type CollectionName,
} from "./ActiveRecord.ts";
import { DataSource } from "./DataSource.ts";
import { DenoKvSource } from "./DenoKvSource.ts";

export class Database<
  Models extends readonly ActiveModel[] = [],
  Protocol extends Protocols = "denokv",
> {
  source: DataSource;
  collections = {} as CollectionMap<Models[number]>;
  get readonly(): boolean {
    return Readonly.some((p) => p === this.source.options.type);
  }

  constructor(init?: DatabaseInit<Models, Protocol>) {
    const { type } = init?.connectionString
      ? DataSource.parse<Protocol>(init.connectionString)
      : { type: undefined };

    switch (type) {
      case "denokv": {
        this.source = new DenoKvSource(init!.connectionString as `denokv://`);
        break;
      }
      default: {
        this.source = new DenoKvSource(DEFAULT_CONN);
      }
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
  Protocol extends Protocols = "denokv",
> = {
  connectionString?: `${Protocol}://${string}`;
  models?: Models;
};

type CollectionMap<Model extends ActiveModel | ActiveRecord> = {
  [Name in CollectionName<Model>]: ActiveCollection<ExtractRecord<Model, Name>>;
};
type ExtractRecord<
  M extends ActiveModel | ActiveRecord,
  N extends (string & {}),
> =
  // deno-lint-ignore no-explicit-any
  | InstanceType<Extract<M, new (...args: any[]) => { collection: N }>>
  | Extract<M, { collection: N }>;

type Protocols = typeof Protocols[number] | (string & {});
const Protocols = [
  "cockroach",
  "denokv",
  "git",
  "markdown",
  "postgres",
] as const;
const Readonly = ["markdown"] as const;
const DEFAULT_CONN = "denokv://:default:" as const;
