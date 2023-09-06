import { ActiveRecord } from "../database/ActiveRecord.ts";

export class Token extends ActiveRecord<"Token"> {
  get collection(): "Token" {
    return "Token";
  }

  get userId(): string {
    throw new Error("Method not implemented.");
  }
}
