import { APP_DATA } from "../constants.ts";
import { ActiveRecord } from "../database/ActiveRecord.ts";
import { uuidv5 } from "../database/uuidv5.ts";
import type { Author, Reader, User } from "./User.ts";

export async function getUser(
  userId: string,
  userType: Author["collection"],
): Promise<Author | undefined>;
export async function getUser(
  userId: string,
  userType?: Reader["collection"],
): Promise<Reader | undefined>;
export async function getUser(
  userId: string,
  userType?: User["collection"],
): Promise<User | undefined>;
export async function getUser(
  userId: string,
  userType?: User["collection"],
): Promise<User | undefined> {
  // Fast path.
  if (userType) {
    const users = ActiveRecord.getCollectionOf<Author | Reader>(userType);
    return await users?.get(userId) ?? undefined;
  }

  const authors = ActiveRecord.getCollectionOf<Author>("Author");
  const readers = ActiveRecord.getCollectionOf<Reader>("Reader");
  return await authors?.get(userId) ??
    await readers?.get(userId) ??
    undefined;
}

export function emailId(email: string) {
  return uuidv5(email, APP_DATA.uuid);
}
