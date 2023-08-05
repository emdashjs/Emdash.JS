import { createXMLRenderer, Helmet, renderSSR } from "../../deps.ts";

export type RenderOptions = {
  status?: number;
  contentType?: string;
  cacheControl?: string;
  headers?: HeadersInit;
};

export type ResponseLike = {
  body: BodyInit;
  headers: Headers;
  status: number;
};

export class Renderer {
  #xmlSsr = createXMLRenderer(renderSSR);

  #setHeaders(headers: Headers, options?: RenderOptions): void {
    if (options?.contentType) {
      headers.set("Content-Type", options.contentType);
    }
    if (options?.cacheControl) {
      headers.set("Cache-Control", options.cacheControl);
    }
  }

  json(
    // deno-lint-ignore no-explicit-any
    input: any,
    options?: RenderOptions,
  ): ResponseLike {
    const response: ResponseLike = {
      body: "",
      headers: new Headers(options?.headers),
      status: options?.status ?? 200,
    };
    if (typeof input === "string" || isBufferSource(input)) {
      response.body = input;
    } else {
      response.body = JSON.stringify(input);
    }
    this.#setHeaders(response.headers, {
      contentType: "application/json",
      ...options,
    });
    return response;
  }

  html(
    // deno-lint-ignore no-explicit-any
    input: any,
    options?: RenderOptions,
  ): ResponseLike {
    const response: ResponseLike = {
      body: "",
      headers: new Headers(options?.headers),
      status: options?.status ?? 200,
    };
    if (typeof input === "string" || isBufferSource(input)) {
      response.body = input;
    } else {
      const app = renderSSR(input);
      const { body, head, footer, attributes } = Helmet.SSR(app);
      response.body = `
      <!DOCTYPE html>
      <html ${attributes.html.toString()}>
        <head>${head.join("\n")}</head>
        <${
        attributes.body.size > 0 ? "body " + attributes.body.toString() : "body"
      }>${body.trim()}${footer.join("\n")}</body>
      </html>`;
    }
    this.#setHeaders(response.headers, {
      contentType: "text/html",
      ...options,
    });

    return response;
  }

  rss(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ): ResponseLike {
    return this.xml(input, {
      ...options,
      contentType: "application/rss+xml",
    });
  }

  xml(
    // deno-lint-ignore no-explicit-any
    input: any,
    options: RenderOptions,
  ): ResponseLike {
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

    const response = new Response(xml, {
      status: options?.status,
    });
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
