import { AppData } from "./AppData.ts";
import { Identity } from "./Identity.ts";
import { Author } from "./User.ts";

export type EmdashModels = typeof models;
export const models = [
  AppData,
  Author,
  Identity,
] as const;

export { AppData, Author, Identity };
