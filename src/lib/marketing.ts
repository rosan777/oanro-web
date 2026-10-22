// Newsletter sign-ups, the one-time "you left something in your bag" reminder, and the "how was it?" email after delivery.
// Every email has an unsubscribe link, and people who unsubscribed never get these.
import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, inArray, isNull, lt, notExists, sql } from "drizzle-orm";
import { newsletterSubscriber, product, savedBag, shopOrder, user } from "./db/schema";
import { optedOut, unsubscribeUrl } from "./customer-mail";
import { sendMail } from "./mailer";
import { layout } from "./order-notify";
import { siteUrl } from "./site-url";
import type { CatalogDb } from "./product-store";

const footer = (email: string) => `\n\nDon't want these emails? Unsubscribe: ${unsubscribeUrl(email)}`;

/** Sign up (or sign up again after unsubscribing). Welcome email only for new sign-ups. */
export async function subscribe(db: CatalogDb, rawEmail: string, locale: "en" | "bn") {
  const email = rawEmail.trim().toLowerCase();
  const [existing] = await db.select().from(newsletterSubscriber).where(eq(newsletterSubscriber.email, email)).limit(1);
  if (existing && !existing.unsubscribedAt) return "already";
  await db.insert(newsletterSubscriber).values({ email, locale, token: randomBytes(16).toString("hex") })
    .onConflictDoUpdate({ target: newsletterSubscriber.email, set: { unsubscribedAt: null, consentAt: new Date(), locale } });
  const text = locale === "bn"
    ? ["OANRO-র নিউজলেটারে স্বাগতম!", "নতুন কালেকশন, বিশেষ অফার আর স্টুডিওর খবর সবার আগে পাবেন। মাসে কয়েকবারের বেশি নয়।"]
    : ["Welcome to the OANRO list!", "You'll hear first about new drops, special offers and Studio news. A few emails a month at most."];
  await sendMail(email, locale === "bn" ? "OANRO-তে স্বাগতম" : "Welcome to OANRO", text.join("\n\n") + footer(email), layout(text[0], [text[1]], { label: locale === "bn" ? "স্টোর দেখুন" : "Visit the store", href: siteUrl() }));
  return "subscribed";
}
export async function newsletterUnsubscribe(db: CatalogDb, email: string) {
  await db.update(newsletterSubscriber).set({ unsubscribedAt: new Date() }).where(eq(newsletterSubscriber.email, email.toLowerCase()));
}

/** Keep the signed-in shopper's bag on the server (only slugs, sizes, colours, quantities). Empty bag = remove. */
export async function saveBag(db: CatalogDb, userId: string, items: { slug: string; size: string; color: string; quantity: number }[]) {
  if (!items.length) { await db.delete(savedBag).where(eq(savedBag.userId, userId)); return; }
  await db.insert(savedBag).values({ userId, items, updatedAt: new Date(), remindedAt: null })
    .onConflictDoUpdate({ target: savedBag.userId, set: { items, updatedAt: new Date(), remindedAt: null } });
}

/** Daily job: one reminder for bags left 24h–7 days ago, when the shopper hasn't ordered since and hasn't unsubscribed. */
export async function sendBagReminders(db: CatalogDb, now = new Date()) {
  const day = 86_400_000;
  const rows = await db.select({ userId: savedBag.userId, items: savedBag.items, updatedAt: savedBag.updatedAt, email: user.email, name: user.name }).from(savedBag)
    .innerJoin(user, eq(user.id, savedBag.userId))
    .where(and(isNull(savedBag.remindedAt), lt(savedBag.updatedAt, new Date(now.getTime() - day)), gt(savedBag.updatedAt, new Date(now.getTime() - 7 * day)), eq(user.emailVerified, true),
      notExists(db.select({ x: sql`1` }).from(shopOrder).where(and(eq(shopOrder.userId, savedBag.userId), gt(shopOrder.createdAt, savedBag.updatedAt))))))
    .limit(100);
  const out = new Set(await optedOut(db));
  const slugs = [...new Set(rows.flatMap(r => r.items.map(i => i.slug)))];
  const names = new Map((slugs.length ? await db.select({ slug: product.slug, name: product.nameEn }).from(product).where(inArray(product.slug, slugs)) : []).map(p => [p.slug, p.name]));
  let sent = 0;
  for (const r of rows) {
    if (out.has(r.email.toLowerCase())) continue;
    const list = r.items.map(i => `• ${names.get(i.slug) ?? i.slug} (${i.size}) × ${i.quantity}`).join("\n");
    const text = [`Hi ${r.name || "there"}, you left a few things in your OANRO bag:`, list, "They're still waiting for you — sizes and stock can change, so finish your order when you're ready."];
    if (await sendMail(r.email, "You left something in your bag", text.join("\n\n") + `\n\n${siteUrl()}/checkout` + footer(r.email), layout("Still thinking it over?", text, { label: "Finish my order", href: `${siteUrl()}/checkout` }))) sent++;
    await db.update(savedBag).set({ remindedAt: now }).where(eq(savedBag.userId, r.userId));
  }
  return sent;
}

/** After delivery: ask how it went (replies and the feedback form reach the team; reviews will use this later). */
export async function sendReviewRequest(db: CatalogDb, orderId: string) {
  const [o] = await db.select({ code: shopOrder.code, email: user.email, name: user.name }).from(shopOrder).innerJoin(user, eq(user.id, shopOrder.userId)).where(eq(shopOrder.id, orderId)).limit(1);
  if (!o || (await optedOut(db)).includes(o.email.toLowerCase())) return false;
  const href = `${siteUrl()}/contact?order=${encodeURIComponent(o.code)}`;
  const text = [`Hi ${o.name || "there"}, your order ${o.code} has been delivered. We hope you love it!`, "How was everything — the product, the packaging, the delivery? Just reply to this email or use the link below. A real person on our team reads every answer.", `আপনার অর্ডার ${o.code} পৌঁছে গেছে। কেমন লাগল জানাবেন? এই ইমেইলের উত্তর দিন বা নিচের লিংকে লিখুন।`];
  return sendMail(o.email, `How was your order ${o.code}?`, text.join("\n\n") + `\n\n${href}` + footer(o.email), layout("How was your order?", text, { label: "Share your feedback", href }));
}
