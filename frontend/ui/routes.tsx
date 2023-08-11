/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h, Helmet, sanitizeHtml, transpile } from "../../deps.ts";
import { App } from "./App.tsx";
import { Server } from "../../backend/server/Server.ts";
import { Login } from "./page/Login.tsx";
import { FirstRun } from "./page/FirstRun.tsx";
import { Marked, MarkedOptions } from "https://esm.sh/marked@7.0.1";
import { markedHighlight } from "https://esm.sh/marked-highlight@2.0.4";
import hljsImport from "https://esm.sh/highlight.js@11.8.0";
import { DEFAULT_POST } from "../../backend/blog/Post.ts";
import { preloadMDXEditor } from "./preloadMDXEditor.ts";
// deno-lint-ignore no-explicit-any
const hljs = hljsImport as any;
const m = new Marked(markedHighlight({
  async: true,
  langPrefix: "hljs language-",
  highlight(code, lang) {
    console.log(lang);
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    const res = hljs.highlight(code, { language });
    console.log(res.value);
    return res.value;
  },
}));

async function marked(src: string, options?: MarkedOptions) {
  return await m.parse(src, { async: true, gfm: true, ...options }) ?? "";
}
export const uiRouter = Server.router();
// deno-lint-ignore no-explicit-any
const HelmetAny = Helmet as any;

uiRouter.get("/", (context) => {
  context.state.render.html(<App>Hello, world!</App>);
});

uiRouter.get("/admin/first_run", async (context) => {
  await context.state.authenticate();
  context.state.render.html(() => (
    <App>
      <FirstRun />
    </App>
  ));
});

uiRouter.get("/login", (context) => {
  context.state.render.html(() => (
    <App>
      <Login />
    </App>
  ));
});

uiRouter.get("/post/:slug(.*)", async (context) => {
  const edit = context.request.url.searchParams.has("edit");
  if (edit) {
    await context.state.authenticate();
  }
  if (context.params.slug === DEFAULT_POST.slug) {
    const renderTime = context.state.timing.start("Render");
    const markup = await marked(DEFAULT_POST.content, { gfm: true });
    const sanitized = sanitizeHtml(markup, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedClasses: {
        "code": ["hljs*", "language-*", "lang-*"],
        "span": ["hljs*", "language-*", "lang-*"],
      },
    });
    context.state.render.html(() => (
      <App>
        <HelmetAny>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css"
          />
          <link rel="stylesheet" href="/static/editor.css" />
          {edit
            ? (
              <script type="module" defer={true}>
                {`
                  import { Editor } from "/static/editor.js";
                  const editor = new Editor().render();
                  fetch("/api/post/${DEFAULT_POST.id}")
                    .then((response) => response.json())
                    .then((post) => {
                      editor.markdown = post.content;
                    });
                  `}
              </script>
            )
            : null}
        </HelmetAny>
        <section>
          <article>
            <h1>{DEFAULT_POST.title}</h1>
            <subtitle>{DEFAULT_POST.subtitle}</subtitle>
            <content
              id={edit ? "editor" : undefined}
              innerHTML={{
                __dangerousHtml: edit ? preloadMDXEditor() : sanitized,
              }}
            >
              {edit
                ? (
                  <placeholder innerHTML={{ __dangerousHtml: sanitized }}>
                  </placeholder>
                )
                : null}
            </content>
          </article>
        </section>
      </App>
    ));
    renderTime.finish();
  }
});

uiRouter.get("/test", (context) => {
  // deno-lint-ignore no-explicit-any
  const HelmetAny = Helmet as any;
  context.state.render.html(() => (
    <App>
      <HelmetAny>
        <link rel="stylesheet" href="/static/editor.css" />
        <script type="module" defer={true}>
          {`
          import { Editor } from "/static/editor.js";
          const editor = new Editor({ markdown: "Hello, **world**!" }).render();
          console.log(editor);
          `}
        </script>
      </HelmetAny>
      <div id="editor"></div>
    </App>
  ));
});
