import { PurgeCSS } from "https://esm.sh/purgecss@5.0.0";

const purgeCss = new PurgeCSS();

function indexOfCss(html: string): number {
  const { length } = html;
  let withinTag = false;
  let tagStart = -1;
  let buffer = "";
  let withinLink = false;
  for (let i = 0; i < length; i++) {
    const char = html.charAt(i);
    if (char === "<") {
      withinTag = true;
      tagStart = i;
    } else if (char === ">") {
      withinLink = false;
      withinTag = false;
      buffer = "";
    } else if (withinLink) {
      if (
        char.trim() === "" ||
        (char === "'" || char === '"') && buffer === "rel="
      ) {
        buffer = "";
      } else {
        const { length: bufLen } = (buffer += char);
        if (bufLen === 10) {
          if (buffer === "stylesheet") {
            return tagStart;
          } else {
            withinLink = false;
          }
        }
      }
    } else if (withinTag) {
      const { length: bufLen } = (buffer += char);
      if (bufLen === 4) {
        if (
          buffer === "styl" || buffer === "scri" || buffer === "/hea" ||
          buffer === "body"
        ) {
          return tagStart;
        }
        if (buffer === "link") {
          withinLink = true;
        }
        withinTag = false;
        buffer = "";
      }
    }
  }
  return -1;
}

function insertStyle(html: string, css: string): string {
  const index = indexOfCss(html);
  const tag = `<style>${css}</style>`;
  return html.slice(0, index) + tag + html.slice(index);
}

export async function purgeStyle(
  html: string,
  styles: string,
): Promise<string> {
  const [{ css } = { css: undefined }] = await purgeCss.purge({
    content: [{ extension: "html", raw: html }],
    css: [{ name: "halfmoon.min.css", raw: styles }],
  });
  if (css?.trim()) {
    return insertStyle(html, css);
  }
  return html;
}
