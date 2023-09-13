import { grayMatter } from "../../deps.ts";
import { ActiveRecord } from "../database/ActiveRecord.ts";
import type { FunctionKeys } from "../types.ts";
import { randomWords, toSlug, toTitle } from "../util/mod.ts";
import { emailId, getUser } from "./helpers.ts";
import { Author } from "./mod.ts";

class ContentBase<T extends string = string> extends ActiveRecord<T> {
  declare author: string;
  declare content: string;
  declare published: boolean;
  declare slug: string;
  declare subtitle?: string;
  declare tags: string[];
  declare title: string;

  get collection(): T {
    return "Content" as T;
  }

  get path(): string {
    return this.id;
  }

  set path(value: string) {
    this.id = value;
  }

  async getAuthor(): Promise<Author | undefined> {
    const authorId = emailId(this.author);
    return await getUser(authorId, "Author");
  }

  toFrontmatter(): string {
    const result = ["---"];
    for (const name of ContentBase.allowedFields) {
      if (name === "content") {
        continue;
      }
      result.push(`${name}: ${this[name] ?? ""}`);
    }
    result.push("---");
    result.push(this.content);
    return result.join("\n");
  }

  // deno-lint-ignore no-explicit-any
  static fromFrontmatter(markdown?: string): Record<string, any> {
    const result: Partial<Content> = {};
    if (markdown) {
      const { content, data, isEmpty } = grayMatter(markdown) as
        & grayMatter.GrayMatterFile<string>
        & { isEmpty: boolean };
      if (!isEmpty) {
        for (const name of ContentBase.allowedFields) {
          result[name] = data[name];
        }
      }
      result.content = content;
    }
    return result;
  }

  static allowedFields: ContentFields[] = [
    "author",
    "content",
    "path",
    "published",
    "slug",
    "subtitle",
    "tags",
    "title",
  ];
}

export type Content = Page | Post;
export type ContentModel = typeof Page | typeof Post;
export type ContentFields = Exclude<
  keyof Page | keyof Post,
  FunctionKeys<Content> | keyof ActiveRecord
>;

export class Page extends ContentBase<"Page"> {
  constructor(record: Partial<Page>) {
    if (record.content) {
      record = {
        ...record,
        ...ContentBase.fromFrontmatter(record.content),
      };
    }
    record.id = record.id ?? record.path;
    record.title = record.title ?? toTitle(randomWords(10));
    record.slug = record.slug ?? toSlug(record.title);
    super({
      ...record,
      id: record.id ? record.id : `/user/draft/${record.slug}`,
    });
  }

  get collection(): "Page" {
    return "Page";
  }
}

export class Post extends ContentBase<"Post"> {
  constructor(record: Partial<Post>) {
    if (record.content) {
      record = {
        ...record,
        ...ContentBase.fromFrontmatter(record.content),
      };
    }
    record.id = record.id ?? record.path;
    record.title = record.title ?? toTitle(randomWords(10));
    record.slug = record.slug ?? toSlug(record.title);
    super({
      ...record,
      id: record.id ? record.id : `/post/${record.slug}`,
    });
  }

  get collection(): "Post" {
    return "Post";
  }
}
