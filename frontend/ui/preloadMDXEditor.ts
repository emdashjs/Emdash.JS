import { Editor } from "../../static/editor.js";

let rendered: string | undefined;

export function preloadMDXEditor() {
  rendered = rendered ?? new Editor({ serverSide: true }).renderToString();
  return rendered;
}
