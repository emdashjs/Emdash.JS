/** @jsx h */
import { h, Helmet } from "../../deps.ts";
import { ComponentProps } from "../types.ts";
import { Css } from "./components/Css.tsx";

// deno-lint-ignore no-explicit-any
const HelmetAny = Helmet as any;

export function App(
  { children }: ComponentProps,
) {
  return (
    <main>
      <HelmetAny>
        <html lang="en" />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/static/favicon.png"></link>
        <link
          rel="stylesheet"
          href="/static/cdn.jsdelivr.net/npm/purecss/3.0.0/build/pure-min.css"
        />
        <Css>
          {`
          :root {
            --font-mono: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
            --font-sans: system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif;
          }
          body {
            display: flex;
            justify-content: center;
            font-family: var(--font-sans);
          }
          pre code {
            font-family: var(--font-mono);
          }
        `}
        </Css>
      </HelmetAny>
      {children}
    </main>
  );
}
