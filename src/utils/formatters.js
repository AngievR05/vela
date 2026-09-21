export function formatAuthors(authors = []) {
  if (!authors.length) return "Unknown author";
  return new Intl.ListFormat("en-GB", {
    style: "long",
    type: "conjunction",
  }).format(authors);
}

export function clampProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
}
