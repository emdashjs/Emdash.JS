import { ActiveRecord } from "../database/ActiveRecord.ts";
import { FunctionKeys } from "../types.ts";
import { emailId } from "./helpers.ts";

class UserBase<T extends string = string> extends ActiveRecord<T> {
  declare email: string;
  declare firstName: string;
  declare lastName: string;

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

  static allowedFields: UserFields[] = [
    "bio",
    "email",
    "firstName",
    "lastName",
  ];
}

export type User = Author | Reader;
export type UserModel = typeof Author | typeof Reader;
export type UserFields = Exclude<
  keyof Author | keyof Reader,
  FunctionKeys<User> | keyof ActiveRecord | "identityId"
>;

export class Author extends UserBase<"Author"> {
  declare bio: string;

  get collection(): "Author" {
    return "Author";
  }

  static allowedFields: UserFields[] = UserBase.allowedFields;
}

export class Reader extends UserBase<"Reader"> {
  declare bio?: string;

  get collection(): "Reader" {
    return "Reader";
  }

  static allowedFields: UserFields[] = UserBase.allowedFields;
}
