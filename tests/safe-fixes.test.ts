import { test } from "node:test";
import assert from "node:assert/strict";
import { originMatchesHost } from "../src/lib/same-host";
import { appSecret } from "../src/lib/app-secret";

const request = (headers: Record<string, string>) => new Request("http://localhost/api/x", { method: "POST", headers });

test("originMatchesHost: same host passes; missing, other or malformed Origin is refused without throwing", () => {
  assert.equal(originMatchesHost(request({ origin: "https://oanro.com", host: "oanro.com" })), true);
  assert.equal(originMatchesHost(request({ origin: "http://localhost:3000", host: "localhost:3000" })), true);
  assert.equal(originMatchesHost(request({ origin: "https://evil.example", host: "oanro.com" })), false);
  assert.equal(originMatchesHost(request({ host: "oanro.com" })), false); // no Origin
  assert.equal(originMatchesHost(request({ origin: "null", host: "oanro.com" })), false); // sandboxed frames send the text "null"
  assert.equal(originMatchesHost(request({ origin: "https://x.test:abc", host: "oanro.com" })), false);
});

test("appSecret: uses BETTER_AUTH_SECRET when set, otherwise the caller's fallback, with one production warning", () => {
  const saved = { secret: process.env.BETTER_AUTH_SECRET, env: process.env.NODE_ENV }, warnings: string[] = [], warn = console.warn;
  console.warn = (message: string) => { warnings.push(String(message)); };
  try {
    process.env.BETTER_AUTH_SECRET = "a-real-secret-value";
    assert.equal(appSecret("fallback-one"), "a-real-secret-value");
    delete process.env.BETTER_AUTH_SECRET;
    assert.equal(appSecret("fallback-one"), "fallback-one"); // same value the code used before the helper existed
    assert.equal(appSecret("fallback-two"), "fallback-two");
    assert.equal(warnings.length, 0); // not production: quiet
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    appSecret("fallback-one"); appSecret("fallback-two");
    assert.equal(warnings.length, 1); // production: warned once, never throws
    assert.match(warnings[0], /BETTER_AUTH_SECRET is not set/);
    assert.ok(!warnings[0].includes("fallback-one")); // the message never prints a secret value
  } finally {
    console.warn = warn;
    if (saved.secret === undefined) delete process.env.BETTER_AUTH_SECRET; else process.env.BETTER_AUTH_SECRET = saved.secret;
    (process.env as Record<string, string | undefined>).NODE_ENV = saved.env;
  }
});
