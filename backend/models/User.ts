import { ActiveRecord } from "../database/ActiveRecord.ts";
import { emailId } from "./helpers.ts";

class UserBase<T extends string = string> extends ActiveRecord<T> {
  email!: string;
  firstName!: string;
  lastName!: string;

  constructor(record: Partial<UserBase<T>>) {
    super({
      ...record,
      id: record.id ? record.id : emailId(record.email!),
    });
  }

  get identityId() {
    return this.id;
  }

  get collection(): T {
    return "User" as T;
  }
}

export type User = Author | Reader;
export type UserModel = typeof Author | typeof Reader;

export class Author extends UserBase<"Author"> {
  bio!: string;

  get collection(): "Author" {
    return "Author";
  }
}

export class Reader extends UserBase<"Reader"> {
  get collection(): "Reader" {
    return "Reader";
  }
}
