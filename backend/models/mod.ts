import { AppData } from "./AppData.ts";
import { Identity } from "./Identity.ts";
import { Session } from "./Session.ts";
import { Author } from "./User.ts";

export type EmdashModels = typeof models;
export const models = [
  AppData,
  Author,
  Identity,
  Session,
] as const;

export { AppData, Author, Identity, Session };
