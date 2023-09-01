import { AppData } from "./AppData.ts";
import { Identity } from "./Identity.ts";
import { Author } from "./User.ts";

export const models = [
  AppData,
  Author,
  Identity,
] as const;

export { AppData, Author, Identity };
