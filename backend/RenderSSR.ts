import { createXMLRenderer, Helmet, renderSSR } from "../deps.ts";
import { ServerTiming } from "./server/ServerTiming.ts";

export type RenderOptions = {
  request: Request;
  contentType?: string;
  cacheControl?: string;
};

export class RenderSSR {
  cache?: Cache;
  #xmlSsr = createXMLRenderer(renderSSR);

  constructor(cache?: Cache) {
    this.cache = cache;
  }

  async html(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ): Promise<Response> {
    const app = renderSSR(input);
    const { body, head, footer, attributes } = Helmet.SSR(app);

    const html = `
    <!DOCTYPE html>
    <html ${attributes.html.toString()}>
      <head>
        ${head.join("\n")}
      </head>
      <body ${attributes.body.toString()}>
        ${body}
        ${footer.join("\n")}
      </body>
    </html>`;

    const response = new Response(html, {
      headers: {
        "Content-Type": "text/html",
        "Server-Timing": ServerTiming.toString(options.request),
      },
    });
    await this.cache?.put(options.request, response.clone());
    return response;
  }

  rss(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ): Promise<Response> {
    return this.xml(input, {
      ...options,
      contentType: "application/rss+xml",
    });
  }

  async xml(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ): Promise<Response> {
    const xmlDirective = '<?xml version="1.0" encoding="utf-8"?>';
    const xml = xmlDirective + this.#xmlSsr(input);
    const response = new Response(xml, {
      headers: {
        "Content-Type": options.contentType ?? "application/xml",
        "Cache-Control": options.cacheControl ?? "no-cache, no-store",
        "Server-Timing": ServerTiming.toString(options.request),
      },
    });
    await this.cache?.put(options.request, response.clone());
    return response;
  }
}
