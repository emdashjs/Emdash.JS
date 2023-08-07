/** @jsx h */
import { h, Helmet } from "../../deps.ts";
import { ComponentProps } from "../types.ts";
import { Css } from "./components/Css.tsx";

export function App(
  { children }: ComponentProps,
) {
  return (
    <main>
      <Helmet>
        <html lang="en" />
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/static/favicon.png"></link>
        <link
          rel="stylesheet"
          href="/static/cdn.jsdelivr.net/npm/purecss/3.0.0/build/pure-min.css"
          integrity="sha384-X38yfunGUhNzHpBaEBsWLO+A0HDYOQi8ufWDkZ0k9e0eXz/tH3II7uKZ9msv++Ls"
        />
        <Css>
          {`
          body {
            display: flex;
            justify-content: center;
          }
        `}
        </Css>
      </Helmet>
      {children}
    </main>
  );
}
