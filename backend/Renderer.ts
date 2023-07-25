import { createXMLRenderer, Helmet, renderSSR } from "../deps.ts";

export type RenderOptions = {
  contentType?: string;
  cacheControl?: string;
};

export class Renderer {
  #xmlSsr = createXMLRenderer(renderSSR);

  #setHeaders(response: Response, options?: RenderOptions): void {
    if (options?.contentType) {
      response.headers.set("Content-Type", options.contentType);
    }
    if (options?.cacheControl) {
      response.headers.set("Cache-Control", options.cacheControl);
    }
  }

  json(
    // deno-lint-ignore no-explicit-any
    input: any,
    options?: RenderOptions,
  ): Response {
    let response: Response;
    if (typeof input === "string" || isBufferSource(input)) {
      response = new Response(input);
      this.#setHeaders(response, {
        contentType: "application/json",
        ...options,
      });
    } else {
      response = Response.json(input);
      this.#setHeaders(response, options);
    }
    return response;
  }

  html(
    // deno-lint-ignore no-explicit-any
    input: any,
    options?: RenderOptions,
  ): Response {
    let html: string | BufferSource;
    if (typeof input === "string" || isBufferSource(input)) {
      html = input;
    } else {
      const app = renderSSR(input);
      const { body, head, footer, attributes } = Helmet.SSR(app);
      html = `
      <!DOCTYPE html>
      <html ${attributes.html.toString()}>
        <head>${head.join("\n")}</head>
        <${
        attributes.body.size > 0 ? "body " + attributes.body.toString() : "body"
      }>${body.trim()}${footer.join("\n")}</body>
      </html>`;
    }
    const response = new Response(html);
    this.#setHeaders(response, {
      contentType: "text/html",
      ...options,
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
    let xml: string | BufferSource;
    if (typeof input === "string") {
      if (input.startsWith(xmlDirective)) {
        xml = input;
      } else {
        xml = xmlDirective + input;
      }
    } else if (isBufferSource(input)) {
      xml = input;
    } else {
      xml = xmlDirective + this.#xmlSsr(input);
    }

    const response = new Response(xml);
    this.#setHeaders(response, {
      contentType: "application/xml",
      ...options,
    });

    return response;
  }
}

// deno-lint-ignore no-explicit-any
function isBufferSource(source: any): source is BufferSource {
  return typeof source === "object" &&
    (ArrayBuffer.isView(source) || "byteLength" in source && "slice" in source);
}
