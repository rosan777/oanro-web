import { test } from "node:test";
import assert from "node:assert/strict";
import { imageData, metadataImage, publicIPv4, publicUrl, readObject, readPreview, signPreview } from "../src/lib/pulse-thumbnail";

test("reject non-public destinations and permit public IPv4", () => {
  for (const url of ["http://example.com", "https://localhost", "https://127.1", "https://user:pass@example.com", "https://example.com:444", "https://foo.internal"]) assert.equal(publicUrl(url), false, url);
  for (const ip of ["127.0.0.1", "10.1.1.1", "169.254.169.254", "172.31.0.1", "192.168.1.1", "100.64.0.1", "198.18.0.1", "224.0.0.1", "::1", "::ffff:127.0.0.1"]) assert.equal(publicIPv4(ip), false, ip);
  assert.equal(publicIPv4("8.8.8.8"), true);
});
test("metadata handles attribute order, relative paths and entities", () => {
  assert.equal(metadataImage(`<meta content='/image.png?a=1&amp;b=2' property='og:image'>`, "https://example.com/news"), "https://example.com/image.png?a=1&b=2");
  assert.equal(metadataImage('<meta property="og:image" content="http://localhost/a">', "https://example.com"), null);
  assert.equal(metadataImage("<p>No metadata</p>", "https://example.com"), null);
});
test("approval is bound to image, owner, article and expiry", () => {
  const secret = "test-only-secret";
  const token = signPreview("owner", "https://example.com/article", "image-snapshot", secret);
  assert.equal(readPreview(token, "owner", "https://example.com/article", secret), "image-snapshot");
  assert.throws(() => readPreview(token, "other", "https://example.com/article", secret));
  assert.throws(() => readPreview(token, "owner", "https://example.com/changed", secret));
  assert.throws(() => readPreview(token + "x", "owner", "https://example.com/article", secret));
  const now = Date.now;
  try { Date.now = () => now() + 11 * 60 * 1000; assert.throws(() => readPreview(token, "owner", "https://example.com/article", secret)); }
  finally { Date.now = now; }
});
test("reject SVG, mismatched raster types and oversized input without Content-Length", async () => {
  assert.throws(() => imageData(Buffer.from('<svg/>'), "image/svg+xml"));
  assert.throws(() => imageData(Buffer.from('<html/>'), "image/png"));
  const request = new Request("https://example.com", { method: "POST", body: JSON.stringify({ payload: "x".repeat(100) }) });
  await assert.rejects(readObject(request, 50));
  await assert.rejects(readObject(new Request("https://example.com", { method: "POST", body: "null" })));
});
