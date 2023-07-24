export function formatSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/(?!\w|\s)./g, "")
    .replace(/\s+/g, "-");
}
