import "server-only";
import { createHash } from "node:crypto";

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
/** Bangladesh mobile in the international form Meta expects (8801XXXXXXXXX), digits only. */
const bdPhone = (p: string) => { const d = p.replace(/\D/g, ""); return d.startsWith("880") ? d : d.startsWith("0") ? `88${d}` : d; };

/**
 * Meta Conversions API: tells Meta about a purchase from our server, so ad results still count when a browser blocks the Pixel.
 * Runs only when the owner set a Pixel ID in admin, META_CAPI_TOKEN is set in Vercel, and the shopper allowed Analytics.
 * Email and phone are sent hashed (SHA-256), as Meta requires. eventId = order code, matching the browser event (no double count).
 */
export async function sendPurchase(o: { pixelId: string; eventId: string; value: number; email: string; phone: string; ip: string; userAgent: string; url: string; slugs: string[] }) {
  const token = process.env.META_CAPI_TOKEN; if (!token || !/^\d{6,20}$/.test(o.pixelId)) return;
  const body = { data: [{ event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: o.eventId, action_source: "website", event_source_url: o.url,
    user_data: { em: o.email ? [sha(o.email)] : undefined, ph: o.phone ? [sha(bdPhone(o.phone))] : undefined, client_ip_address: o.ip || undefined, client_user_agent: o.userAgent || undefined },
    custom_data: { currency: "BDT", value: o.value, content_ids: o.slugs, content_type: "product" } }] };
  await fetch(`https://graph.facebook.com/v21.0/${o.pixelId}/events?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) }).catch(() => {});
}
