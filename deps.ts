export { parse } from "https://deno.land/std@0.194.0/path/mod.ts";
export { exists } from "https://deno.land/std@0.194.0/fs/exists.ts";
export { lookup } from "https://deno.land/x/media_types@v3.0.3/mod.ts";
export {
  parse as parsePathToRegExp,
  pathToRegexp,
} from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";
export {
  Component,
  h,
  Helmet,
  renderSSR,
  Suspense,
} from "https://deno.land/x/nano_jsx@v0.0.37/mod.ts";
export {
  createXMLHandler,
  createXMLRenderer,
  xml,
} from "https://deno.land/x/xml4jsx@1.0.0/mod.ts";

declare global {
  interface URLSearchParams extends Map<string, string> {
    size: number;
  }
}