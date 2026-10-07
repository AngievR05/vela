import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createEntryId } from "../src/lib/browser-id.js";

test("Entry IDs remain secure, valid and distinct on LAN HTTP without randomUUID", () => {
  const lanCrypto = { getRandomValues: bytes => webcrypto.getRandomValues(bytes) };
  const ids = Array.from({ length: 1000 }, () => createEntryId(lanCrypto));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const zero = createEntryId({ getRandomValues: bytes => bytes });
  assert.equal(zero, "00000000-0000-4000-8000-000000000000");
  assert.equal(createEntryId({ randomUUID: () => "native-id" }), "native-id");
  assert.throws(() => createEntryId({}), /current browser/);
});
