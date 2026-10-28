import { promises as dns } from "node:dns";

/**
 * Can this domain receive email at all? (DNS check, server side.)
 *
 * What this proves: the domain exists and publishes a way to deliver mail.
 * What it does NOT prove: that the mailbox exists or that the person owns it. Only the verification link does that.
 *
 *  "ok"      MX records exist, or (no MX) the domain has an address record that mail can fall back to (RFC 5321).
 *  "no-mail" the domain does not exist, has no MX and no address record, or publishes a "Null MX" ("." = accepts no mail).
 *  "unknown" DNS failed for a temporary reason (timeout, server failure). We never block a sign-up on that.
 */
export type DomainVerdict = "ok" | "no-mail" | "unknown";

export type DnsLookup = Pick<typeof dns, "resolveMx" | "resolve4" | "resolve6">;

/** Error codes that mean "the DNS answered: there is nothing here". Everything else is treated as a temporary failure. */
const NOTHING_THERE = new Set(["ENOTFOUND", "ENODATA"]);
const errorCode = (error: unknown) => (error as { code?: string } | null)?.code ?? "";

async function lookup(domain: string, resolver: DnsLookup): Promise<DomainVerdict> {
  try {
    const mx = await resolver.resolveMx(domain);
    if (mx.length === 1 && (mx[0].exchange === "" || mx[0].exchange === ".")) return "no-mail"; // Null MX
    if (mx.length > 0) return "ok";
  } catch (error) {
    if (!NOTHING_THERE.has(errorCode(error))) return "unknown";
  }
  // No MX: mail falls back to the domain's own address record.
  for (const addressLookup of [() => resolver.resolve4(domain), () => resolver.resolve6(domain)]) {
    try { if ((await addressLookup()).length > 0) return "ok"; }
    catch (error) { if (!NOTHING_THERE.has(errorCode(error))) return "unknown"; }
  }
  return "no-mail";
}

export async function checkMailDomain(domain: string, resolver: DnsLookup = dns, timeoutMs = 2500): Promise<DomainVerdict> {
  const clean = domain.trim().toLowerCase().replace(/\.$/, "");
  if (!clean.includes(".")) return "no-mail";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DomainVerdict>(resolve => { timer = setTimeout(() => resolve("unknown"), timeoutMs); });
  try { return await Promise.race([lookup(clean, resolver), timeout]); } finally { clearTimeout(timer); }
}
