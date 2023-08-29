import { APP_DATA } from "../AppData.ts";
import { ActiveRecord } from "../database/ActiveRecord.ts";
import { uuidv5 } from "../database/uuidv5.ts";

export class User extends ActiveRecord {
  email!: string;
  firstName!: string;
  lastName!: string;

  constructor(data: Partial<User>) {
    super({
      ...data,
      id: data.id ? data.id : uuidv5(data.email!, APP_DATA.uuid),
    });
  }
}

export class Author extends User {
  bio!: string;
}
