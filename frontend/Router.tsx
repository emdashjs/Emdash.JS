// deno-lint-ignore-file no-explicit-any
/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

declare global {
  interface URLSearchParams extends Map<string, string> {
    size: number;
  }
}

import { createXMLRenderer, h, Helmet, renderSSR } from "../deps.ts";
import { URLPatternPlus } from "../backend/URLPatternPlus.ts";
import { RequestMeasure } from "../backend/RequestMeasure.ts";

const renderXML = createXMLRenderer(renderSSR);
export class Router {
  #performance = new WeakMap<Request, RequestMeasure[]>();
  cache?: Cache;
  routes = new Map<RouteName, URLPatternPlus | boolean>([]);

  #isRouteName(name: any): name is RouteName {
    return Array.from(this.routes.keys()).includes(name);
  }

  #getRoute(request: Request) {
    const measure = this.#createMeasure(request, "Route");
    const url = new URL(request.url);
    const [_, second] = url.pathname.split("/");
    const name = "/" + second;
    const isRoute = this.#isRouteName(name);
    const result = isRoute ? this.routes.get(name) : undefined;
    const route: Route = {
      name: isRoute ? name : null,
      url,
      params: {},
    };

    if (result && result !== true) {
      const match = result.exec(url);

      if (match) {
        const entries = Object.entries(match.pathname.groups ?? {});
        for (const [key, value] of entries) {
          route.params[key] = value ? decodeURIComponent(value) : value;
        }
        const searchEntries = Object.entries(match.search.groups ?? {});
        for (const [key, value] of searchEntries) {
          route.params[key] = Array.isArray(value)
            ? value.map((item) => decodeURIComponent(item))
            : typeof value === "string"
            ? decodeURIComponent(value)
            : value;
        }
      }
    }
    measure.finish();
    return route;
  }

  respond(cache?: Cache) {
    this.cache = cache;
    return async (request: Request) => {
      this.#createMeasure(request, "CPU", true);
      const cacheMeasure = this.#createMeasure(request, "Cache");
      const cached = await cache?.match(request);
      cacheMeasure.finish();
      if (cached) {
        const response = cached.clone();
        response.headers.set("Server-Timing", this.#serverTime(request));
        return response;
      }
      const route = this.#getRoute(request);

      return Response.redirect(route.url.origin, 307);
    };
  }

  async #renderHTML(request: Request, input: any) {
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
        "Server-Timing": this.#serverTime(request),
      },
    });
    await this.cache?.put(request, response.clone());
    return response;
  }

  #renderRss(request: Request, input: any) {
    return this.#renderXml(request, input, "application/rss+xml");
  }

  async #renderXml(
    request: Request,
    input: any,
    contentType = "application/xml",
    cache = "no-cache, no-store",
  ) {
    const xmlDirective = '<?xml version="1.0" encoding="utf-8"?>';
    const xml = xmlDirective + renderXML(input);
    const response = new Response(xml, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cache,
        "Server-Timing": this.#serverTime(request),
      },
    });
    await this.cache?.put(request, response.clone());
    return response;
  }

  #serverTime(request: Request) {
    return this.#performance.get(request)?.map((measure) =>
      measure.serverTime()
    ).join(", ") ?? "noMetrics";
  }

  #createMeasure(request: Request, name: string, init?: boolean) {
    const measure = new RequestMeasure(name);
    if (init) {
      this.#performance.set(request, [measure]);
    } else {
      this.#performance.get(request)?.push(measure);
    }
    return measure;
  }
}

type RouteName = "/";

interface Route<T extends Record<string, any> = Record<string, any>> {
  name: RouteName | null;
  url: URL;
  params: T;
}
