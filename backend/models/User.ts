import { APP_DATA } from "../AppData.ts";
import { ActiveRecord } from "../database/ActiveRecord.ts";
import { uuidv5 } from "../database/uuidv5.ts";

export class User<T extends string = string> extends ActiveRecord<T> {
  email!: string;
  firstName!: string;
  lastName!: string;

  constructor(data: Partial<User>) {
    super({
      ...data,
      id: data.id ? data.id : uuidv5(data.email!, APP_DATA.uuid),
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
