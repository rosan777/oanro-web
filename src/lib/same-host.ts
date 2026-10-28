/**
 * True when the request's Origin header names this same host, i.e. a browser form or fetch sent from our own pages.
 * A missing or malformed Origin (for example the text "null" that sandboxed frames send) counts as "no", never as an error.
 */
export function originMatchesHost(request: Request): boolean {
  const origin = request.headers.get("origin"), host = request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
