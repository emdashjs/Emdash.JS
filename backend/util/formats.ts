export function toSlug(words: string | string[]): string {
  return (Array.isArray(words) ? words.join(" ") : words)
    .toLowerCase()
    .trim()
    .replace(/(?!\w|\s)./g, "")
    .replace(/\s+/g, "-");
}

export function toCapitalized(word: string): string {
  word = word.trim();
  return word[0].toUpperCase() + word.slice(1);
}

export function toTitle(words: string | string[]): string {
  return (Array.isArray(words) ? words : words.split(" "))
    .map(toCapitalized)
    .join(" ");
}
