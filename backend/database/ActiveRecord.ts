import { Awaiterable, DataRecord, DataSource } from "./DataSource.ts";

// deno-lint-ignore no-empty-interface
export interface ActiveRecord extends DataRecord {
}

export class ActiveRecord {
  id!: string;
  complexId?: string;

  constructor(record: Partial<ActiveRecord>) {
    Object.assign(this, record, { save: this.save, destroy: this.destroy });
    if (!this.id) {
      this.id = crypto.randomUUID();
    }
    if (!this.created) {
      this.created = new Date().toISOString();
    }
    if (!this.modified) {
      this.modified = new Date().toISOString();
    }
  }

  async save(): Promise<boolean> {
    const col = recordCollection.get(this);
    return await col?.set(this) ?? false;
  }

  async destroy(): Promise<boolean> {
    const col = recordCollection.get(this);
    return await col?.delete(this.id, this.complexId) ?? false;
  }
}

export interface ActiveSchema<T extends ActiveRecord> {
  new (record: Partial<T>): T;
}

export class ActiveCollection<T extends ActiveRecord = ActiveRecord> {
  collection: string;
  schema: ActiveSchema<T>;

  constructor(schema: ActiveSchema<T>, source: DataSource) {
    this.collection = schema.name;
    this.schema = schema;
    collectionSource.set(this, source);
  }

  async *#deleteMany(
    keys: Awaiterable<[id: string, complexId?: string]>,
  ) {
    const { collection } = this;
    for await (const key of keys) {
      const [id, complexId] = key;
      yield { collection, id, complexId };
    }
  }

  async *#setMany(records: Awaiterable<T>) {
    const { collection } = this;
    for await (const record of records) {
      const { id, complexId } = record;
      yield { collection, id, complexId, record };
    }
  }

  newRecord(data: Partial<T>): T {
    const record = new this.schema(data);
    recordCollection.set(record, this);
    return record;
  }

  async delete(id: string, complexId?: string): Promise<boolean> {
    const source = collectionSource.get(this)!;
    const { collection } = this;
    const result = await source.driver.delete({ collection, id, complexId });
    return result.success;
  }

  async deleteMany(
    keys: Awaiterable<[id: string, complexId?: string]>,
  ): Promise<boolean> {
    const source = collectionSource.get(this)!;
    const result = await source.driver.deleteMany(this.#deleteMany(keys));
    return result.success;
  }

  async get(id: string, complexId?: string): Promise<T | null> {
    const source = collectionSource.get(this)!;
    const { collection } = this;
    const result = await source.driver.get({ collection, id, complexId });
    if (result.record) {
      return this.newRecord(result.record as Partial<T>);
    }
    return null;
  }

  async *getMany(id: string): Awaiterable<T> {
    const source = collectionSource.get(this)!;
    const { collection } = this;
    const result = source.driver.getMany({ collection, id });
    for await (const record of result.records) {
      yield this.newRecord(record as Partial<T>);
    }
  }

  async set(record: T): Promise<boolean> {
    const source = collectionSource.get(this)!;
    const { collection } = this;
    const { id, complexId } = record;
    const result = await source.driver.set({
      collection,
      id,
      complexId,
      record,
    });
    return result.success;
  }

  async setMany(records: Awaiterable<T>): Promise<boolean> {
    const source = collectionSource.get(this)!;
    const result = await source.driver.setMany(this.#setMany(records));
    return result.success;
  }

  async stats(): Promise<CollectionStats> {
    const { collection } = this;
    const source = collectionSource.get(this)!;
    const { recordCount } = await source.driver.stats(this.collection);
    return { collection, recordCount };
  }

  static getSourceOf(collection: GenericCollection): DataSource {
    return collectionSource.get(collection)!;
  }
}

export type CollectionStats = {
  /** The number of records in the collection. */
  recordCount: number;
  /** The collection name. */
  collection: string;
};

// deno-lint-ignore no-explicit-any
type GenericCollection = ActiveCollection<any>;

const collectionSource = new WeakMap<GenericCollection, DataSource>();
const recordCollection = new WeakMap<ActiveRecord, GenericCollection>();
