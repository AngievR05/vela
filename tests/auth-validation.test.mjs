import test from "node:test";
import assert from "node:assert/strict";
import { validateAuthInput } from "../src/lib/auth/validation.js";

test("email validation accepts trimmed addresses and rejects malformed input", () => {
  assert.deepEqual(validateAuthInput({ mode: "forgot", email: " reader@example.com " }), {});
  assert.deepEqual(validateAuthInput({ mode: "forgot", email: "reader@" }), { email: "Enter a valid email address." });
});

test("login permits existing short passwords while signup enforces the minimum", () => {
  const input = { email: "reader@example.com", password: "old" };
  assert.deepEqual(validateAuthInput({ ...input, mode: "login" }), {});
  assert.deepEqual(validateAuthInput({ ...input, mode: "signup" }), { password: "Use 8 or more characters." });
});

test("reset requires matching passwords and preserves significant whitespace", () => {
  assert.deepEqual(validateAuthInput({ mode: "reset", password: "abcdefgh", confirmation: "abcdefgi" }), { confirmation: "Your passwords do not match." });
  assert.deepEqual(validateAuthInput({ mode: "reset", password: "  secret  ", confirmation: "  secret  " }), {});
  assert.deepEqual(validateAuthInput({ mode: "reset", password: "abcdefgh", confirmation: "" }), { confirmation: "Your passwords do not match." });
});
