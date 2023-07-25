import { createXMLRenderer, h, Helmet, renderSSR } from "../../deps.ts";
import { RequestMeasure } from "./RequestMeasure.ts";
import { RouteRequest } from "./RouteRequest.ts";
import { RouteMap } from "./Route.ts";

const renderXML = createXMLRenderer(renderSSR);
export class Router {
  #performance = new WeakMap<Request, RequestMeasure[]>();
  cache?: Cache;
  routes: RouteMap = new Map([]);

  #getRoute(request: Request) {
    const measure = this.#createMeasure(request, "Route");
    const routeRequest = new RouteRequest(request);
    const route = this.routes.get(routeRequest.name);
    if (route) {
      route.exec(routeRequest);
    }
    measure.finish();
    return routeRequest;
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
      const render = await route.render(this.#performance.get(request)!);

      if (render) {
        render.headers.set("Server-Timing", this.#serverTime(request));
        return render;
      }

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
