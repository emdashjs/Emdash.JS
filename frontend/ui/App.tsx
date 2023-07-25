/** @jsx h */
import { h, Helmet } from "../../deps.ts";
import { ComponentProps } from "../types.ts";

export function App(
  { children }: ComponentProps,
) {
  return (
    <div>
      <Helmet>
        <html lang="en" />
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/static/favicon.png"></link>
      </Helmet>
      {children}
    </div>
  );
}
