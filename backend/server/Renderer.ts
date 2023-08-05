import { Context, createXMLRenderer, Helmet, renderSSR } from "../../deps.ts";

export type RenderOptions = {
  status?: number;
  contentType?: string;
  cacheControl?: string;
};

export type ResponseLike = {
  body: BodyInit;
  headers: Headers;
  status: number;
};

export class Renderer {
  context: Context;
  constructor(context: Context) {
    this.context = context;
  }

  #setHeaders(options?: RenderOptions): void {
    if (options?.cacheControl) {
      this.context.response.headers.set("Cache-Control", options.cacheControl);
    }
  }

  json(
    // deno-lint-ignore no-explicit-any
    input: any,
    options?: RenderOptions,
  ) {
    this.context.response.status = options?.status ?? 200;
    this.context.response.type = options?.contentType ?? "application/json";
    if (typeof input === "string" || isBufferSource(input)) {
      this.context.response.body = input;
    } else {
      this.context.response.body = JSON.stringify(input);
    }
    this.#setHeaders(options);
    return this.context.response;
  }

  html(
    // deno-lint-ignore no-explicit-any
    input: any,
    options?: RenderOptions,
  ) {
    this.context.response.status = options?.status ?? 200;
    this.context.response.type = options?.contentType ?? "text/html";
    if (typeof input === "string" || isBufferSource(input)) {
      this.context.response.body = input;
    } else {
      const app = renderSSR(input);
      const { body, head, footer, attributes } = Helmet.SSR(app);
      this.context.response.body = `
      <!DOCTYPE html>
      <html ${attributes.html.toString()}>
        <head>${head.join("\n")}</head>
        <${
        attributes.body.size > 0 ? "body " + attributes.body.toString() : "body"
      }>${body.trim()}${footer.join("\n")}</body>
      </html>`;
    }
    this.#setHeaders(options);

    return this.context.response;
  }

  rss(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ) {
    return this.xml(input, {
      contentType: "application/rss+xml",
      ...options,
    });
  }

  xml(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ) {
    this.context.response.status = options?.status ?? 200;
    this.context.response.type = options?.contentType ?? "application/xml";
    if (typeof input === "string") {
      if (input.startsWith(xmlDirective)) {
        this.context.response.body = input;
      } else {
        this.context.response.body = xmlDirective + input;
      }
    } else if (isBufferSource(input)) {
      this.context.response.body = input;
    } else {
      this.context.response.body = xmlDirective + xmlSsr(input);
    }

    this.#setHeaders(options);

    return this.context.response;
  }
}

const xmlDirective = '<?xml version="1.0" encoding="utf-8"?>';
const xmlSsr = createXMLRenderer(renderSSR);

// deno-lint-ignore no-explicit-any
function isBufferSource(source: any): source is BufferSource {
  return typeof source === "object" &&
    (ArrayBuffer.isView(source) || "byteLength" in source && "slice" in source);
}
