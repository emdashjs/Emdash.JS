import { User, USER_BUILTIN } from "../auth/User.ts";
import { APP_COLLECTION, APP_DATA } from "../constants.ts";
import { KvJsonExclude, KvJsonPartial, KvRecord } from "../deno_kv/KvRecord.ts";
import { count, database } from "../deno_kv/database.ts";
import { JsonLike } from "../deno_kv/types.ts";
import { formatSlug } from "./formats.ts";

type RecordType = typeof APP_COLLECTION.POST;
const RecordType = APP_COLLECTION.POST;

export type PostJson = JsonLike<Post, KvJsonExclude, KvJsonPartial>;

export class Post extends KvRecord<RecordType> {
  author: string;
  content: string;
  slug: string;
  subtitle?: string;
  tags: string[];
  title: string;
  internal = undefined;

  constructor(record?: Partial<Post> | PostJson) {
    super({
      id: record?.id ?? crypto.randomUUID(),
      type: record?.type ?? RecordType,
    });
    this.author = record?.author ?? APP_DATA.UUID;
    this.title = record?.title ?? "";
    this.content = record?.content ?? "";
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
}

export const DEFAULT_POST = new Post({
  title: "Example Blog Post",
  subtitle: "Example subtitle",
  content: `
## Markdown
Every post is written in Github-flavor Markdown. This makes authoring easy, and hopefully delightful!

**Example code block**
\`\`\`typescript
export function helloWorld(): string {
  return "Hello, world!";
}
\`\`\`
  `,
});
