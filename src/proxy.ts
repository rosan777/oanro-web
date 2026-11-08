import { NextResponse, type NextRequest } from "next/server";

// Bangla pages live under /bn. They are served by the same pages; the language is passed to the
// server in a request header so Bangla is rendered on the server and Google can index it.
// Incoming x-oanro-* headers are always overwritten, so visitors cannot spoof them.
//
// The proxy also runs again for its own rewritten request (/bn/x → /x). That second pass must keep
// the language set by the first, so the rewrite carries a random per-process token visitors cannot
// know; without it the second pass reset every Bangla page to English.
const PASS = crypto.randomUUID();

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.headers.get("x-oanro-pass") === PASS) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.set("x-oanro-pass", PASS);
  if (pathname === "/bn" || pathname.startsWith("/bn/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    headers.set("x-oanro-locale", "bn");
    headers.set("x-oanro-path", url.pathname);
    return NextResponse.rewrite(url, { request: { headers } });
  }
  headers.set("x-oanro-locale", "en");
  headers.set("x-oanro-path", pathname);
  return NextResponse.next({ request: { headers } });
}

// Skip API routes, Next.js internals and any file with an extension (images, sitemap.xml, robots.txt).
export const config = { matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"] };
