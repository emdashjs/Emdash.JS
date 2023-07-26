import { User, USER_BUILTIN } from "../auth/User.ts";
import { APP_COLLECTION, APP_DATA } from "../constants.ts";
import { KvRecord } from "../deno_kv/KvRecord.ts";
import { count, database } from "../deno_kv/database.ts";
import { JsonLike } from "../deno_kv/types.ts";
import { formatSlug } from "./formats.ts";

export class Post extends KvRecord<"post"> {
  author: string;
  content: string;
  slug: string;
  subtitle?: string;
  tags: string[];
  title: string;
  internal = undefined;

  constructor(record?: Partial<Post>) {
    super({
      id: record?.id ?? crypto.randomUUID(),
      type: record?.type ?? "post",
      created: record?.created,
      modified: record?.modified,
    });
    this.author = record?.author ?? APP_DATA.UUID;
    this.title = record?.title ?? "";
    this.content = record?.content ?? "";
    this.created = record?.created ?? new Date();
    this.modified = record?.modified ?? this.created;
    this.slug = record?.slug || this.title ? formatSlug(this.title) : this.id;
    this.subtitle = record?.subtitle;
    this.tags = record?.tags ?? [];
  }

  async getAuthor(): Promise<User> {
    if (this.author === APP_DATA.UUID) {
      return USER_BUILTIN.SYSTEM;
    }
    const kv = await database();
    const user = await kv.get<User>(["user", this.author]);
    return user.value ?? USER_BUILTIN.NOT_EXIST;
  }

  static async count(): Promise<number> {
    return await count(APP_COLLECTION.USER);
  }

  static fromJSON(input: JsonLike<Post>) {
    return new Post(KvRecord.likeJSON(input));
  }
}
