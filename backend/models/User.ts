import { APP_DATA } from "../AppData.ts";
import { ActiveRecord } from "../database/ActiveRecord.ts";
import { uuidv5 } from "../database/uuidv5.ts";

export class User<T extends string = string> extends ActiveRecord<T> {
  email!: string;
  firstName!: string;
  lastName!: string;

  constructor(record: Partial<User<T>>) {
    super({
      ...record,
      id: record.id ? record.id : uuidv5(record.email!, APP_DATA.uuid),
    });
  }

  get collection(): T {
    return "User" as T;
  }
}

export class Author extends User<"Author"> {
  bio!: string;

  get collection(): "Author" {
    return "Author";
  }
}
