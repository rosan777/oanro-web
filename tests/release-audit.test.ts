// Regression checks for defects found in the 2026-11-01 release audit (see RELEASE_READINESS.md).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("checkout asks for privacy consent exactly once", () => {
  const form = source("src/components/checkout-form.tsx");
  assert.equal(form.match(/name="consent"/g)?.length, 1);
});

test("language button's accessible name starts with the visible language code", () => {
  const locale = source("src/components/locale.tsx");
  assert.match(locale, /aria-label=\{`\$\{current\.short\} – /);
});

test("admin store badge does not claim checkout is off (OANRO_STORE_LIVE only affects Google data)", () => {
  assert.doesNotMatch(source("src/components/admin-shell.tsx"), /checkout is off/i);
});
