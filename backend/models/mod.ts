import { AppData } from "./AppData.ts";
import { Identity } from "./Identity.ts";
import { Session } from "./Session.ts";
import { Token } from "./Token.ts";
import { Author, Reader, type User, type UserModel } from "./User.ts";

export type EmdashModels = typeof EmdashModels;
export const EmdashModels = [
  AppData,
  Author,
  Identity,
  Reader,
  Session,
  Token,
] as const;

export { AppData, Author, Identity, Reader, Session, Token, User, UserModel };
