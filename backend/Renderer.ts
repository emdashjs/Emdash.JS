import { createXMLRenderer, Helmet, renderSSR } from "../deps.ts";
import { ServerTiming } from "./server/ServerTiming.ts";

export type RenderOptions = {
  request: Request;
  contentType?: string;
  cacheControl?: string;
};

export class Renderer {
  #xmlSsr = createXMLRenderer(renderSSR);

  html(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ): Response {
    let html: string;
    if (typeof input === "string") {
      html = input;
    } else {
      const app = renderSSR(input);
      const { body, head, footer, attributes } = Helmet.SSR(app);

      html = `
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
    }

    const response = new Response(html, {
      headers: {
        "Content-Type": "text/html",
        "Server-Timing": ServerTiming.toString(options.request),
      },
    });
    return response;
  }

  rss(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ): Response {
    return this.xml(input, {
      ...options,
      contentType: "application/rss+xml",
    });
  }

  xml(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ): Response {
    const xmlDirective = '<?xml version="1.0" encoding="utf-8"?>';
    let xml: string;
    if (typeof input === "string") {
      if (input.startsWith(xmlDirective)) {
        xml = input;
      } else {
        xml = xmlDirective + input;
      }
    } else {
      xml = xmlDirective + this.#xmlSsr(input);
    }

    const response = new Response(xml, {
      headers: {
        "Content-Type": options.contentType ?? "application/xml",
        "Cache-Control": options.cacheControl ?? "no-cache, no-store",
        "Server-Timing": ServerTiming.toString(options.request),
      },
    });
    return response;
  }
}
