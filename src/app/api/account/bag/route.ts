import { currentSession } from "@/lib/access";
import { saveBag } from "@/lib/marketing";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

/** Signed-in shoppers' bag, kept so one reminder email can be sent if they leave. Signed-out visitors: nothing is stored. */
export async function PUT(request: Request) {
  const session = await currentSession().catch(() => null);
  if (!session?.user || !process.env.DATABASE_URL) return Response.json({ ok: false }, { headers: noStore });
  const data = await request.json().catch(() => ({})) as { items?: unknown };
  const items = Array.isArray(data.items) ? data.items.slice(0, 20).flatMap(raw => {
    const i = raw as Record<string, unknown>;
    return typeof i?.slug === "string" && /^[a-z0-9-]{1,60}$/.test(i.slug) && typeof i.size === "string" && i.size.length <= 20 && Number.isInteger(i.quantity) && (i.quantity as number) >= 1 && (i.quantity as number) <= 10
      ? [{ slug: i.slug, size: i.size, color: typeof i.color === "string" ? i.color.slice(0, 30) : "", quantity: i.quantity as number }] : [];
  }) : [];
  await saveBag(catalogDb(), session.user.id, items).catch(() => null);
  return Response.json({ ok: true }, { headers: noStore });
}
