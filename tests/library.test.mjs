import test from "node:test";
import assert from "node:assert/strict";
import { filterLibrary, manualBookSchema, detailMutationSchema, readingDays } from "../src/lib/library-data.js";

const id = "08978c87-0a49-4382-9e32-801751323371";
test("manual entries validate ISBN checksums and reject spoofed ownership", () => {
  const entry = { entryId: id, title: " A book ", author: " Reader ", isbn: "978-0-06-267810-2", pageCount: 526 };
  assert.equal(manualBookSchema.parse(entry).isbn, "9780062678102");
  assert.equal(manualBookSchema.parse({ ...entry, isbn: "0-8044-2957-X" }).isbn, "080442957X");
  for (const invalid of [{ ...entry, isbn: "9780062678103" }, { ...entry, title: " " }, { ...entry, pageCount: 0 }, { ...entry, userId: id }]) {
    assert.equal(manualBookSchema.safeParse(invalid).success, false);
  }
  assert.equal(detailMutationSchema.safeParse({ kind: "status", id, status: "dnf", reason: " ", useForLearning: false }).success, false);
  assert.equal(detailMutationSchema.safeParse({ kind: "status", id, status: "dnf", reason: "Pacing" }).success, false);
});

test("combined Library filters exclude removed and unknown-length books without mutating the Library", () => {
  const books = [
    { id: "a", title: "Zebra", author: "Writer", status: "reading", categories: ["Fiction / Fantasy"], pageCount: 399, favourite: true, rating: 4, updatedAt: "2026-10-01" },
    { id: "b", title: "Alpha", author: "Another", status: "want_to_read", categories: ["Fantasy"], pageCount: null, favourite: true, rating: null, updatedAt: "2026-10-02" },
    { id: "c", title: "Removed", author: "Writer", status: "reading", categories: ["Fantasy"], pageCount: 120, favourite: true, isRemoved: true, updatedAt: "2026-10-03" },
  ];
  assert.deepEqual(filterLibrary(books, { query: "WRITER", genres: ["Fantasy"], short: true, favourites: true, status: "reading" }).map(book => book.id), ["a"]);
  assert.deepEqual(filterLibrary(books, { sort: "title" }).map(book => book.id), ["b", "a"]);
  assert.deepEqual(filterLibrary(books, { short: true }).map(book => book.id), ["a"]);
  assert.deepEqual(books.map(book => book.id), ["a", "b", "c"]);
  assert.equal(readingDays({ startedAt: "2026-10-01", finishedAt: "2026-10-06" }), 6);
  assert.equal(readingDays({ startedAt: null, finishedAt: "2026-10-06" }), null);
});
