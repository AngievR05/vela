import test from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage, isTransientAuthError, performAuthRequest, sessionNeedsLogin } from "../src/lib/auth/requests.js";
import { authUnavailableResponse, readerDeniedResponse } from "../src/lib/auth/http.js";

const input = { email: " reader@example.com ", password: "test-password", origin: "https://vela.example", destination: "/library?status=reading" };

test("reset retains a usable link after transport errors, without updating the password", async () => {
  for (const error of [{ name: "AuthRetryableFetchError", status: 503 }, { status: 0 }, { status: 502 }]) {
    const auth = { getUser: async () => ({ data: { user: null }, error }), updateUser: () => assert.fail("must not update after failed verification") };
    const result = await performAuthRequest(auth, { ...input, mode: "reset" });
    assert.equal(result.error, error);
    assert.match(authErrorMessage(result.error), /could not connect/);
    assert.doesNotMatch(authErrorMessage(result.error), /expired/);
  }
});

test("reset rejects missing and invalid sessions", async () => {
  for (const response of [{ data: { user: null }, error: null }, { data: { user: null }, error: { status: 401 } }]) {
    const result = await performAuthRequest({ getUser: async () => response }, { ...input, mode: "reset" });
    assert.equal(result.error.code, "session_expired");
  }
});

test("reset updates only a verified user and surfaces recoverable update failures", async () => {
  const failure = { error: { code: "same_password", message: "Choose a different password." } };
  const auth = {
    getUser: async () => ({ data: { user: { id: "reader" } }, error: null }),
    updateUser: async (values) => {
      assert.deepEqual(values, { password: input.password });
      return failure;
    },
  };
  assert.equal(await performAuthRequest(auth, { ...input, mode: "reset" }), failure);
  assert.equal(authErrorMessage(failure.error), "Choose a different password.");
});

test("login, signup and recovery use trimmed email and preserve password characters", async () => {
  const password = "  significant spaces  ";
  const auth = {
    signInWithPassword: async (values) => {
      assert.deepEqual(values, { email: "reader@example.com", password });
      return { error: null };
    },
    signUp: async (values) => {
      assert.equal(values.email, "reader@example.com");
      assert.equal(values.password, password);
      const callback = new URL(values.options.emailRedirectTo);
      assert.equal(callback.origin, input.origin);
      assert.equal(callback.pathname, "/auth/callback");
      assert.equal(callback.searchParams.get("next"), input.destination);
      return { data: { session: null }, error: null };
    },
    resetPasswordForEmail: async (email, options) => {
      assert.equal(email, "reader@example.com");
      assert.equal(new URL(options.redirectTo).searchParams.get("next"), "/reset-password");
      return { error: null };
    },
  };
  for (const mode of ["login", "signup", "forgot"]) {
    assert.equal((await performAuthRequest(auth, { ...input, password, mode })).error, null);
  }
});

test("session sync catches signed-out startup and reader changes", () => {
  assert.equal(sessionNeedsLogin("a", "INITIAL_SESSION", null), true);
  assert.equal(sessionNeedsLogin("a", "SIGNED_OUT", null), true);
  assert.equal(sessionNeedsLogin("a", "SIGNED_IN", { user: { id: "b" } }), true);
  assert.equal(sessionNeedsLogin("a", "INITIAL_SESSION", { user: { id: "a" } }), false);
  assert.equal(sessionNeedsLogin("a", "TOKEN_REFRESHED", { user: { id: "a" } }), false);
  assert.equal(sessionNeedsLogin("a", "USER_UPDATED", { user: { id: "a" } }), false);
});

test("invalid credentials are not treated as connection failures", () => {
  assert.equal(isTransientAuthError({ status: 401, code: "invalid_credentials" }), false);
  assert.match(authErrorMessage({ code: "invalid_credentials" }), /incorrect/);
  assert.match(authErrorMessage({ code: "over_request_rate_limit" }), /Wait a moment/);
});

test("email service configuration failures give recoverable account messages", () => {
  assert.match(authErrorMessage({ code: "email_address_not_authorized", message: "Email address not authorized" }), /Account emails are unavailable/);
  assert.match(authErrorMessage({ code: "email_address_not_authorized" }), /input is still here/);
  assert.match(authErrorMessage({ code: "email_provider_disabled" }), /temporarily unavailable/);
  assert.match(authErrorMessage({ code: "signup_disabled" }), /New accounts are temporarily unavailable/);
});

test("temporary email verification failures remain retryable at the original link", async () => {
  const response = authUnavailableResponse();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("expires"), "0");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("retry-after"), "5");
  assert.match(await response.text(), /reload this page/);
});

test("API authorization distinguishes an outage from an invalid session", () => {
  assert.equal(readerDeniedResponse({ user: { id: "reader" }, error: null }), null);
  assert.equal(readerDeniedResponse({ user: null, error: null }).status, 401);
  assert.equal(readerDeniedResponse({ user: null, error: { status: 401 } }).status, 401);
  const unavailable = readerDeniedResponse({ user: null, error: { status: 503 } });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("retry-after"), "5");
  assert.equal(unavailable.headers.get("cache-control"), "private, no-store");
});
