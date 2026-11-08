// The /bn language proxy: Bangla survives the proxy's second pass over its own rewrite, and visitors
// cannot set the language headers themselves.

import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";

/** Request headers the proxy passes on (Next encodes them as x-middleware-request-* on the response). */
function forwarded(res: Response) {
  const out = new Headers();
  for (const [k, v] of res.headers)
    if (k.startsWith("x-middleware-request-")) out.set(k.slice(21), v);
  return out;
}

test("/bn keeps Bangla through the proxy's second pass", () => {
  const first = proxy(new NextRequest("http://localhost/bn/shop"));
  assert.match(first.headers.get("x-middleware-rewrite") ?? "", /\/shop$/);
  const passOn = forwarded(first);
  assert.equal(passOn.get("x-oanro-locale"), "bn");
  assert.equal(passOn.get("x-oanro-path"), "/shop");
  // Second pass: the rewritten request (/shop) arrives with the headers the first pass set.
  const second = proxy(new NextRequest("http://localhost/shop", { headers: passOn }));
  assert.equal(
    forwarded(second).get("x-oanro-locale"),
    null,
    "second pass leaves the headers alone",
  );
});

test("visitors cannot choose the language with headers", () => {
  const spoof = proxy(
    new NextRequest("http://localhost/", {
      headers: { "x-oanro-locale": "bn", "x-oanro-pass": "guess" },
    }),
  );
  assert.equal(forwarded(spoof).get("x-oanro-locale"), "en");
  const bn = proxy(new NextRequest("http://localhost/bn", { headers: { "x-oanro-locale": "en" } }));
  assert.equal(forwarded(bn).get("x-oanro-locale"), "bn");
});
