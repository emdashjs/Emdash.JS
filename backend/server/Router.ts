import { createXMLRenderer, h, Helmet, renderSSR } from "../../deps.ts";
import { RouteRequest } from "./RouteRequest.ts";
import { RouteMap } from "./Route.ts";
import { ServerTiming } from "./ServerTiming.ts";

const renderXML = createXMLRenderer(renderSSR);
export class Router {
  #routes: RouteMap = new Map([]);
  cache?: Cache;
  constructor(options?: RouterOptions) {
    this.cache = options?.cache;
  }

  respond(cache?: Cache): Deno.ServeHandler {
    this.cache = cache;
    return async (request: Request, info: Deno.ServeHandlerInfo) => {
      const timing = ServerTiming.get(request);
      timing.start("CPU");
      const cacheMeasure = timing.start("Cache");
      const cached = await cache?.match(request);
      cacheMeasure.finish();
      if (cached) {
        const response = cached.clone();
        response.headers.set("Server-Timing", timing.toString());
        return response;
      }
      const routeRequest = this.#routeRequest(request);
      const render = await routeRequest.render();

      if (render) {
        render.headers.set("Server-Timing", timing.toString());
        return render;
      }

      return Response.redirect(routeRequest.url.origin, 307);
    };
  }

  #routeRequest(request: Request) {
    const measure = ServerTiming.get(request).start("Route");
    const routeRequest = new RouteRequest(request);
    const route = this.#routes.get(routeRequest.name);
    if (route) {
      route.exec(routeRequest);
    }
    measure.finish();
    return routeRequest;
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
        "Server-Timing": ServerTiming.toString(request),
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
        "Server-Timing": ServerTiming.toString(request),
      },
    });
    await this.cache?.put(request, response.clone());
    return response;
  }
}

export type RouterOptions = {
  cache?: Cache;
};
