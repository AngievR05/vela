const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

export async function searchGoogleBooks(query, maxResults = 10) {
  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(Math.min(maxResults, 20)));
  url.searchParams.set("printType", "books");

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`Google Books responded with ${response.status}`);
  }

  const data = await response.json();

  return (data.items ?? []).map(mapGoogleBook);
}

function mapGoogleBook(item) {
  const info = item.volumeInfo ?? {};

  return {
    googleBooksId: item.id,
    title: info.title ?? "Untitled",
    authors: info.authors ?? [],
    description: info.description ?? null,
    pageCount: info.pageCount ?? null,
    categories: info.categories ?? [],
    publishedDate: info.publishedDate ?? null,
    thumbnailUrl: normaliseImageUrl(
      info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null
    ),
  };
}

function normaliseImageUrl(url) {
  if (!url) return null;
  return url.replace(/^http:/, "https:");
}
