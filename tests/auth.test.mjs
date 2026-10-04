import test from "node:test";
import assert from "node:assert/strict";
import { safeNext, isProtectedPath } from "../src/lib/auth/redirect.js";

test("return destinations stay inside protected app routes", () => {
  for (const value of [undefined, "https://evil.example", "//evil.example", "/\\evil.example", "/home/../../auth/callback", "/login", "/home\n", "/home/../../%2f%2fevil.example"]) {
    assert.equal(safeNext(value), "/home");
  }
  assert.equal(safeNext("/library?status=reading#books"), "/library?status=reading#books");
  assert.equal(safeNext("/dna/signals"), "/dna/signals");
});

test("route protection includes descendants without catching unrelated pages", () => {
  for (const route of ["/home", "/library/book", "/settings/privacy", "/discover", "/dna"]) assert.equal(isProtectedPath(route), true);
  for (const route of ["/", "/login", "/signup", "/library-other", "/auth/callback"]) assert.equal(isProtectedPath(route), false);
});
