import sanitizeHtml from "https://esm.sh/sanitize-html@2.11.0";
import grayMatter from "npm:gray-matter@4.0.3";
import * as phcFormat from "https://esm.sh/@phc/format@1.0.0";
const phc: PhcFormat = phcFormat;
export { grayMatter, phc, sanitizeHtml };
export * as Path from "https://deno.land/std@0.196.0/path/mod.ts";
export * as Fs from "https://deno.land/std@0.196.0/fs/exists.ts";
export * as Base64 from "https://deno.land/std@0.196.0/encoding/base64.ts";
export * as Base64Url from "https://deno.land/std@0.196.0/encoding/base64url.ts";
export * as MediaType from "https://deno.land/x/media_types@v3.0.3/mod.ts";
export * as Path2RegExp from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";
export {
  Member,
  Struct,
} from "https://codeberg.org/aaronhuggins/struct.js/raw/tag/0.8.0/mod.ts";
export { bcrypt, bcryptVerify } from "https://esm.sh/hash-wasm@4.9.0";
export { marked } from "https://esm.sh/marked@7.0.1";
export { CookieMap } from "https://deno.land/std@0.196.0/http/cookie_map.ts";
export { toHashString } from "https://deno.land/std@0.196.0/crypto/to_hash_string.ts";
export { timingSafeEqual } from "https://deno.land/std@0.196.0/crypto/timing_safe_equal.ts";
export {
  Application,
  Context,
  createHttpError,
  REDIRECT_BACK,
  Router,
} from "https://deno.land/x/oak@v12.6.0/mod.ts";
export type {
  RouteParams,
  RouterContext,
} from "https://deno.land/x/oak@v12.6.0/mod.ts";
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
export { bundle, transpile } from "https://deno.land/x/emit@0.25.0/mod.ts";
export { Buffer } from "node:buffer";
import type { Buffer } from "node:buffer";

declare global {
  interface URLSearchParams extends Map<string, string> {
    size: number;
  }
}

export type PhcFormatObject = {
  id: string;
  version: number;
  params: Record<string, number | string>;
  salt: Buffer;
  hash: Buffer;
};
type PhcFormat = {
  serialize(options: Partial<PhcFormatObject>): string;
  deserialize(phcstr: string): PhcFormatObject;
};
