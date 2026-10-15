import { test } from "node:test";
import assert from "node:assert/strict";
import { validateUploadedImage } from "../src/lib/pulse-upload";

test("upload rejects active content, fake types, invalid encoding and oversized bytes", () => {
  for (const value of [null, "https://example.com/image.png", "data:image/svg+xml;base64,PHN2Zy8+", "data:image/png;base64,PHN2Zy8+", "data:image/jpeg;base64,!!!", "data:image/jpeg;base64," + Buffer.alloc(193 * 1024, 255).toString("base64")]) {
    assert.throws(() => validateUploadedImage(value));
  }
});
test("upload accepts a bounded PNG snapshot", () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  assert.equal(validateUploadedImage(png), png);
});
