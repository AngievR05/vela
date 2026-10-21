import assert from "node:assert/strict";
import fs from "node:fs";

// Read-only checks. No account, Library entry or provider request is created.
const origin = new URL(process.argv[2] || "");
assert.equal(origin.protocol, "https:", "Use the production HTTPS origin");
assert.equal(origin.pathname, "/", "Pass the origin without a page path");
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash, "Use a plain origin");
const checks = [];
async function get(path) {
  const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(30000) });
  const body = await response.text();
  return { response, body };
}
for (const path of ["/", "/welcome", "/login", "/signup", "/forgot-password", "/privacy", "/terms"]) {
  const { response, body } = await get(path);
  assert.equal(response.status, 200, `${path} should render`);
  assert.ok(body.includes("Vela"), `${path} should contain the app`);
  checks.push({ path, status: response.status });
}
for (const path of ["/home", "/library", "/discover", "/dna", "/settings", "/stats", "/setup"]) {
  const { response } = await get(path);
  assert.ok([303, 307, 308].includes(response.status), `${path} should require login`);
  const location = new URL(response.headers.get("location"), origin);
  assert.equal(location.origin, origin.origin);
  assert.equal(location.pathname, "/login");
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  checks.push({ path, status: response.status, loginRequired: true });
}
for (const path of ["/api/home", "/api/settings", "/api/dna", "/api/stats", "/api/books/search?q=test"]) {
  const { response } = await get(path);
  assert.equal(response.status, 401, `${path} should deny signed-out requests`);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  checks.push({ path, status: response.status, private: true });
}
for (const path of ["/auth/callback", "/auth/confirm?type=signup"]) {
  const { response } = await get(path);
  assert.ok([303, 307, 308].includes(response.status));
  const location = new URL(response.headers.get("location"), origin);
  assert.equal(location.origin, origin.origin, "Invalid callbacks must stay on production");
  assert.equal(location.pathname, "/login");
  checks.push({ path, status: response.status, sameOrigin: true });
}
const { response: logo, body: svg } = await get("/brand/logo.svg");
assert.equal(logo.status, 200);
assert.ok(svg.includes("<svg"));
checks.push({ path: "/brand/logo.svg", status: logo.status });
const result = { date: new Date().toISOString(), origin: origin.origin, checks, passed: true,
  limits: ["Does not verify authenticated writes, email delivery, configured redirect allowlists or AI relevance."] };
console.log(JSON.stringify(result, null, 2));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + "\n");
