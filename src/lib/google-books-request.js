import {createQuotaGuard} from "./provider-policy.js";
const sharedQuota=createQuotaGuard();

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

export async function searchGoogleBooksRequest(query, maxResults = 10, {apiKey,fetcher=fetch,quotaGuard=sharedQuota}={}) {
  if(!apiKey)throw new Error("Book search is not configured. You can still add books manually.");
  quotaGuard.check();
  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(Math.min(maxResults, 40)));
  url.searchParams.set("printType", "books");
  url.searchParams.set("key", apiKey);

  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 },
    signal: AbortSignal.timeout(15000),
  });

  quotaGuard.observe(response.status);
  if (!response.ok) {
    throw new Error(`Google Books responded with ${response.status}.`);
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
      info.imageLinks?.large ?? info.imageLinks?.medium ?? info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null
    ),
    isbns: (info.industryIdentifiers || []).filter(identifier => ["ISBN_10", "ISBN_13"].includes(identifier.type)).map(identifier => identifier.identifier),
  };
}

export async function getGoogleBookRequest(id, {apiKey,fetcher=fetch,quotaGuard=sharedQuota}={}) {
  if(!apiKey)throw new Error("Book search is not configured. You can still add books manually.");
  quotaGuard.check();
  const url = new URL(`${GOOGLE_BOOKS_URL}/${encodeURIComponent(id)}`);
  url.searchParams.set("key", apiKey);
  const response = await fetcher(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000) });
  quotaGuard.observe(response.status);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Google Books responded with ${response.status}.`);
  return mapGoogleBook(await response.json());
}

function normaliseImageUrl(url) {
  if (!url) return null;
  return url.replace(/^http:/, "https:");
}
