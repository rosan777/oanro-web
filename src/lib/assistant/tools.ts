// The only operations the language model may use. Every one reads public shop data through explicit fields; none writes,
// none takes credentials, none reaches the network. Results are plain data the server validates before anything is shown.
import { z } from "zod";
import { formatPrice, type Product } from "../catalog";
import { feeText } from "../delivery-fee";
import type { CheckoutRules } from "../order-store";
import { rank, related, type Field } from "../smart-search";
import { stageText } from "../order-stages";
import type { PolicyFacts, ProductCard, StoreMode, TrackedOrder } from "./types";

/** Everything the tools need, injected so tests and the route use the same code against different sources. */
export type ToolContext = {
  /** Published products of published sections only (the storefront list). */
  products: () => Promise<Product[]>;
  rules: () => Promise<CheckoutRules>;
  mode: () => Promise<StoreMode>;
  paymentMethods: () => Promise<string[]>;
  /** Owner-written FAQ answers (enabled ones), so getPolicy can use them alongside the rules. */
  faq?: () => Promise<{ question: string; answer: string }[]>;
};

export const searchInput = z.object({ query: z.string().trim().max(80).describe("What the shopper wants, in their own words"), maxPrice: z.number().int().min(0).max(1_000_000).optional(), section: z.enum(["seasonal", "caps", "tech", "jewelry"]).optional() }).strict();
export const productInput = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,60}$/) }).strict();
export const policyTopics = ["delivery", "payment", "returns", "cash_on_delivery", "tracking", "all"] as const;
export const policyInput = z.object({ topic: z.enum(policyTopics) }).strict();

const fields = (p: Product): Field[] => [{ text: p.name, weight: 3 }, { text: p.bn?.name ?? "", weight: 3 }, { text: p.category, weight: 2 }, { text: p.bn?.category ?? "", weight: 2 }, { text: p.tagline, weight: 1 }, { text: p.bn?.tagline ?? "", weight: 1 }, { text: p.colors?.map(c => `${c.name} ${c.bn}`).join(" ") ?? "", weight: 1 }];

export function toCard(p: Product, mode: StoreMode): ProductCard {
  return { slug: p.slug, name: p.name, nameBn: p.bn?.name ?? "", category: p.category, url: `/products/${p.slug}`, image: p.image ?? null, position: p.position,
    price: p.price, compareAt: p.compareAt ?? null, inStock: p.inStock !== false, left: p.left ?? null, sizes: p.sizes,
    colors: (p.colors ?? []).map(c => ({ id: c.id, name: c.name, nameBn: c.bn, hex: c.hex })), soldOut: p.soldOut ?? [], preview: !mode.live };
}
const inSection = (p: Product, section?: string) => !section || p.collectionId === section || (section === "seasonal" && !p.collectionId) || (section === "jewelry" && /jewel|ring|necklace|earring|bangle|anklet|pendant/i.test(`${p.category} ${p.name}`));

export async function searchProducts(raw: unknown, ctx: ToolContext): Promise<{ cards: ProductCard[]; total: number; note?: string }> {
  const input = searchInput.parse(raw);
  const [all, mode] = await Promise.all([ctx.products(), ctx.mode()]);
  const pool = all.filter(p => inSection(p, input.section) && (input.maxPrice === undefined || p.price <= input.maxPrice));
  let hits = input.query ? rank(input.query, pool, fields) : pool;
  let note: string | undefined;
  // A price ceiling must never hide an item the shopper named: if only the ceiling excluded it, show it and say so.
  if (!hits.length && input.query && input.maxPrice !== undefined) {
    const named = rank(input.query, all.filter(p => inSection(p, input.section)), fields);
    if (named.length) { hits = named; note = `Nothing matches at or below ${formatPrice(input.maxPrice)}; these match the name but cost more.`; }
  }
  if (!hits.length && input.query) { hits = related(input.query, pool, fields); if (hits.length) note = "No exact match; these are similar items."; }
  // Available items first, then sold-out ones (still shown, labelled), at most 5 cards.
  hits = [...hits.filter(p => p.inStock !== false), ...hits.filter(p => p.inStock === false)];
  return { cards: hits.slice(0, 5).map(p => toCard(p, mode)), total: hits.length, note };
}
export async function getProduct(raw: unknown, ctx: ToolContext): Promise<{ card: ProductCard | null; description?: string; specs?: [string, string][] }> {
  const { slug } = productInput.parse(raw);
  const [all, mode] = await Promise.all([ctx.products(), ctx.mode()]);
  const p = all.find(x => x.slug === slug);
  return p ? { card: toCard(p, mode), description: p.description.slice(0, 400), specs: p.specs.slice(0, 8) } : { card: null };
}
const bnNum = (s: string) => s.replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
export async function getPolicy(raw: unknown, ctx: ToolContext): Promise<PolicyFacts & { faq: { question: string; answer: string }[] }> {
  const { topic } = policyInput.parse(raw);
  const [r, methods, faq] = await Promise.all([ctx.rules(), ctx.paymentMethods(), ctx.faq ? ctx.faq() : Promise.resolve([])]);
  const dhaka = r.dhakaDays.replace("-", "–"), outside = r.outsideDays.replace("-", "–");
  const en: Record<string, string> = {
    delivery: `Delivery charge: ${feeText(r, "en")}. Delivery takes ${dhaka} days inside Dhaka and ${outside} days outside Dhaka after payment is confirmed. The delivery charge is not refundable once the order is confirmed.`,
    payment: `${methods.length ? `Pay by ${methods.join(" or ")} (Send Money) using the number shown at checkout, then enter the Transaction ID.` : "Online payment numbers are not set up right now."} We never ask for your PIN, OTP or password.`,
    returns: r.returnDays > 0 ? `If a wrong, damaged or missing item arrives, tell us within ${r.returnDays} day${r.returnDays === 1 ? "" : "s"} of delivery with a photo and we replace it or refund the product price.` : "We don't accept returns at the moment. For a wrong or damaged item, contact us on the delivery day with a photo.",
    cash_on_delivery: r.codLimit > 0 ? `Cash on delivery is available for orders up to ${formatPrice(r.codLimit)}: you first send the delivery charge (${feeText(r, "en")}) by bKash or Nagad, then pay the product price in cash on arrival.` : "Cash on delivery is not available right now.",
    tracking: "Track an order with its order number (starts with OA-) and the phone number you ordered with.",
  };
  const bn: Record<string, string> = {
    delivery: `ডেলিভারি চার্জ: ${feeText(r, "bn")}। পেমেন্ট নিশ্চিত হওয়ার পর ঢাকার ভিতরে ${bnNum(dhaka)} দিন, ঢাকার বাইরে ${bnNum(outside)} দিন লাগে। অর্ডার নিশ্চিত হলে ডেলিভারি চার্জ ফেরতযোগ্য নয়।`,
    payment: `${methods.length ? `${methods.join(" বা ")} (Send Money) দিয়ে চেকআউটে দেখানো নম্বরে টাকা পাঠিয়ে Transaction ID দিন।` : "এই মুহূর্তে অনলাইন পেমেন্টের নম্বর চালু নেই।"} আমরা কখনো PIN, OTP বা পাসওয়ার্ড চাই না।`,
    returns: r.returnDays > 0 ? `ভুল, ক্ষতিগ্রস্ত বা অনুপস্থিত পণ্য এলে ডেলিভারির ${bnNum(String(r.returnDays))} দিনের মধ্যে ছবিসহ জানান; আমরা বদলে দেব বা পণ্যের দাম ফেরত দেব।` : "এই মুহূর্তে রিটার্ন নেওয়া হয় না। ভুল বা ক্ষতিগ্রস্ত পণ্য পেলে ডেলিভারির দিনই ছবিসহ জানান।",
    cash_on_delivery: r.codLimit > 0 ? `${formatPrice(r.codLimit, "bn")} পর্যন্ত অর্ডারে ক্যাশ অন ডেলিভারি পাওয়া যায়: আগে ডেলিভারি চার্জ (${feeText(r, "bn")}) bKash বা Nagad-এ পাঠান, পণ্য হাতে পেয়ে নগদে দাম দিন।` : "এই মুহূর্তে ক্যাশ অন ডেলিভারি চালু নেই।",
    tracking: "অর্ডার নম্বর (OA- দিয়ে শুরু) আর অর্ডারের ফোন নম্বর দিয়ে ট্র্যাক করুন।",
  };
  const pick = (m: Record<string, string>) => topic === "all" ? ["delivery", "payment", "returns", "cash_on_delivery"].map(k => m[k]).join("\n\n") : m[topic];
  return { topic, deliveryInside: formatPrice(r.deliveryCharge), deliveryOutside: formatPrice(r.outsideCharge), dhakaDays: r.dhakaDays, outsideDays: r.outsideDays, codLimit: r.codLimit, returnDays: r.returnDays, paymentMethods: methods, text: { en: pick(en), bn: pick(bn) },
    faq: faq.slice(0, 12).map(f => ({ question: f.question.slice(0, 200), answer: f.answer.slice(0, 600) })) };
}
/** Every taka amount the server has verified in this turn: model prose may only repeat these. */
export function allowedAmounts(cards: ProductCard[], policy: PolicyFacts | null, rules?: CheckoutRules): Set<number> {
  const set = new Set<number>();
  for (const c of cards) { set.add(c.price); if (c.compareAt) set.add(c.compareAt); }
  if (policy) { set.add(policy.codLimit); }
  if (rules) { set.add(rules.deliveryCharge); set.add(rules.outsideCharge); set.add(rules.codLimit); }
  return set;
}

/** Tracking result shown to the visitor: status only. Built from the existing verified lookup; never passed through the model. */
export function trackedView(order: { code: string; status: string; delivery: string | null; courier: string | null; trackingCode: string | null; events: { stage: string; at: string }[] }): TrackedOrder {
  const stage = order.delivery ?? order.status; const last = order.events.at(-1);
  const label = stageText[stage] ?? stageText[order.status] ?? [stage, stage];
  return { code: order.code, stage, stageLabel: { en: label[0], bn: label[1] }, updatedAt: last?.at ?? "", courier: order.courier, trackingCode: order.trackingCode };
}
