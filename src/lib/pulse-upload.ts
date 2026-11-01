import { imageData } from "./pulse-thumbnail";

/**
 * Checks an uploaded image sent as a base64 data URL (JPEG, PNG or WebP, about 256 KB at most).
 * The base64 must round-trip exactly, and imageData() then checks the file's real type and size.
 * Throws "INVALID_IMAGE" on any problem; returns the cleaned data URL.
 */
export function validateUploadedImage(value: unknown): string {
  if (typeof value !== "string" || value.length > 262200) throw new Error("INVALID_IMAGE");
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error("INVALID_IMAGE");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.toString("base64") !== match[2]) throw new Error("INVALID_IMAGE");
  return imageData(bytes, match[1]);
}
