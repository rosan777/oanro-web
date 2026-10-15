import { createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

const MAX_IMAGE = 192 * 1024;
export function publicUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1600) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      !isIP(u.hostname) && /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname) &&
      !/\.(local|localhost|internal|test|invalid|example)$/i.test(u.hostname);
  } catch { return false; }
}
// Deliberately IPv4-only; IPv6-only publishers use the normal OANRO fallback.
export function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}
async function download(raw: string, limit: number, signal: AbortSignal, hops = 0): Promise<{ bytes: Buffer; url: string; type: string }> {
  if (!publicUrl(raw) || hops > 3) throw new Error("URL_NOT_ALLOWED");
  signal.throwIfAborted();
  const url = new URL(raw);
  const addresses = await lookup(url.hostname, { family: 4, all: true });
  signal.throwIfAborted();
  if (!addresses.length || addresses.some(item => !publicIPv4(item.address))) throw new Error("ADDRESS_NOT_ALLOWED");
  // Connect to the validated literal address: there is no second DNS resolution.
  // Original host remains the TLS servername and HTTP Host, with certificate checks on.
  const response = await new Promise<{ bytes: Buffer; type: string; location?: string }>((resolve, reject) => {
    const req = request({ hostname: addresses[0].address, family: 4, port: 443,
      servername: url.hostname, path: url.pathname + url.search, agent: false, signal,
      headers: { Host: url.host, Accept: "text/html,image/jpeg,image/png,image/webp", "Accept-Encoding": "identity", "User-Agent": "OANRO-Preview/1.0" } }, res => {
      const status = res.statusCode ?? 500;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        resolve({ bytes: Buffer.alloc(0), type: "", location: res.headers.location }); res.destroy(); return;
      }
      if (status !== 200 || Number(res.headers["content-length"] ?? 0) > limit ||
          (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity")) {
        res.destroy(); reject(new Error("RESPONSE_REJECTED")); return;
      }
      let size = 0; const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > limit) { res.destroy(); reject(new Error("TOO_LARGE")); }
        else chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("aborted", () => reject(new Error("ABORTED")));
      res.on("end", () => resolve({ bytes: Buffer.concat(chunks), type: String(res.headers["content-type"] ?? "").split(";")[0].toLowerCase() }));
    });
    req.on("error", reject); req.end();
  });
  if (response.location) return download(new URL(response.location, url).href, limit, signal, hops + 1);
  return { ...response, url: url.href };
}
function decode(value: string) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, entity => {
    const known: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
    if (known[entity.toLowerCase()]) return known[entity.toLowerCase()];
    const hex = entity.toLowerCase().startsWith("&#x");
    const n = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  });
}
export function metadataImage(html: string, base: string): string | null {
  const candidates = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "");
    }
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (attrs.content && !candidates.has(key)) candidates.set(key, attrs.content);
  }
  for (const key of ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]) {
    try { const url = new URL(candidates.get(key) ?? "", base).href;
      if (candidates.has(key) && publicUrl(url)) return url;
    } catch { /* Try the next supported metadata key. */ }
  }
  return null;
}
export function imageData(bytes: Buffer, type: string) {
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!bytes.length || bytes.length > MAX_IMAGE || !((type === "image/png" && png) || (type === "image/jpeg" && jpeg) || (type === "image/webp" && webp))) throw new Error("IMAGE_NOT_ALLOWED");
  return `data:${type};base64,${bytes.toString("base64")}`;
}
export async function discoverThumbnail(url: string) {
  const signal = AbortSignal.timeout(10000);
  const work = async () => {
    const page = await download(url, 6 * 1024 * 1024, signal);
    if (page.type !== "text/html" && page.type !== "application/xhtml+xml") return null;
    const candidate = metadataImage(page.bytes.toString("utf8"), page.url);
    if (!candidate) return null;
    const image = await download(candidate, MAX_IMAGE, signal);
    return imageData(image.bytes, image.type);
  };
  // DNS may not honour AbortSignal; the caller still has a total 10-second budget.
  return Promise.race([work(), new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () => reject(new Error("TIMEOUT")), { once: true });
  })]);
}
export function signPreview(owner: string, url: string, image: string, secret: string) {
  const payload = Buffer.from(JSON.stringify({ owner, url, image, expires: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function readPreview(token: unknown, owner: string, url: string, secret: string): string {
  if (typeof token !== "string" || token.length > 360000) throw new Error("INVALID_PREVIEW");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("INVALID_PREVIEW");
  const expected = createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("INVALID_PREVIEW");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (data.owner !== owner || data.url !== url || typeof data.expires !== "number" || data.expires <= Date.now() || typeof data.image !== "string") throw new Error("INVALID_PREVIEW");
  return data.image;
}
export async function readObject(request: Request, maxBytes = 400000): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break;
      size += value.length; if (size > maxBytes) throw new Error("TOO_LARGE"); chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const data: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!data || Array.isArray(data) || typeof data !== "object") throw new Error("INVALID_OBJECT");
  return data as Record<string, unknown>;
}
