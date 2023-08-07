/** @jsx h */
import { h } from "../../../deps.ts";

export function Css({ children }: { children?: string }) {
  children = Array.isArray(children) ? children[0] : children;
  children = children
    ?.replace(/\n\s*|/gui, "")
    .replace(/\s+\{/gui, "{")
    .replace(/:\s+/gui, ":");
  return (
    <style>
      {children}
    </style>
  );
}
