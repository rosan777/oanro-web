import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { lead, orderItem, role, rolePermission, shopOrder, staffMember, systemOwner, user } from "./db/schema";
import { formatPrice } from "./catalog";
import { sendMail } from "./mailer";
import { siteUrl } from "./site-url";
import { formatDhaka } from "./dhaka-time";
import { staffTwoFactorRequired } from "./two-factor-policy";
import type { CatalogDb } from "./product-store";

// Order emails. Customers get both English and Bangla in one message (we don't store a language per order).
// Staff alerts go to the owner and active staff whose role can approve payments (COD ones also need "cod.manage").
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const bn = (s: string) => s.replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
const tk = (n: number) => formatPrice(n);

async function loadOrder(db: CatalogDb, id: string) {
  const [o] = await db.select({ id: shopOrder.id, code: shopOrder.code, status: shopOrder.status, delivery: shopOrder.deliveryStatus, paymentType: shopOrder.paymentType,
    method: shopOrder.method, total: shopOrder.total, deliveryCharge: shopOrder.deliveryCharge, codDue: shopOrder.codDue, courier: shopOrder.courier, trackingCode: shopOrder.trackingCode,
    rejectReason: shopOrder.rejectReason, customerName: shopOrder.customerName, phone: shopOrder.phone, address: shopOrder.address, email: user.email })
    .from(shopOrder).innerJoin(user, eq(user.id, shopOrder.userId)).where(eq(shopOrder.id, id)).limit(1);
  if (!o) return null;
  const items = await db.select({ name: orderItem.name, size: orderItem.size, quantity: orderItem.quantity, unitPrice: orderItem.unitPrice }).from(orderItem).where(eq(orderItem.orderId, id));
  return { ...o, items };
}
type Order = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;
const itemLines = (o: Order) => o.items.map(i => `• ${i.name} (${i.size}) × ${i.quantity} — ${tk(i.unitPrice * i.quantity)}`).join("\n");
const method = (o: Order) => o.method === "bkash" ? "bKash" : "Nagad";
export function layout(title: string, paragraphs: string[], cta?: { label: string; href: string }) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#151515">
<div style="background:#1f513c;color:#fff;padding:16px 20px;font-weight:700;letter-spacing:.04em">OANRO</div>
<div style="padding:20px;border:1px solid #deded8;border-top:0;background:#fff"><h2 style="margin:0 0 12px;font-size:18px">${esc(title)}</h2>
${paragraphs.map(p => `<p style="margin:0 0 12px;line-height:1.55;white-space:pre-line">${esc(p)}</p>`).join("")}
${cta ? `<p style="margin:18px 0 4px"><a href="${cta.href}" style="background:#1f513c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${esc(cta.label)}</a></p>` : ""}
</div><p style="font-size:12px;color:#686862;padding:10px 20px">This is an automatic message from OANRO. Never share your bKash/Nagad PIN with anyone, including us.</p></div>`;
}

async function staffEmails(db: CatalogDb, cod: boolean) {
  const [owner] = await db.select({ email: user.email }).from(systemOwner).innerJoin(user, eq(user.id, systemOwner.userId)).limit(1);
  const rows = await db.select({ email: user.email, permission: rolePermission.permission }).from(staffMember)
    .innerJoin(user, eq(user.id, staffMember.userId)).innerJoin(rolePermission, eq(rolePermission.roleId, staffMember.roleId))
    .where(and(eq(staffMember.status, "active"), inArray(rolePermission.permission, ["orders.manage", "cod.manage"])));
  const byEmail = new Map<string, Set<string>>();
  for (const r of rows) byEmail.set(r.email, (byEmail.get(r.email) ?? new Set()).add(r.permission));
  const staff = [...byEmail].filter(([, p]) => p.has("orders.manage") && (!cod || p.has("cod.manage"))).map(([e]) => e);
  return [...(owner ? [owner.email] : []), ...staff];
}

/** New order waiting for a payment check → owner and payment approvers. */
export async function notifyNewOrder(db: CatalogDb, orderId: string) {
  const o = await loadOrder(db, orderId); if (!o) return;
  const cod = o.paymentType === "cod";
  const subject = `New ${cod ? "cash-on-delivery " : ""}order ${o.code} · ${tk(o.total)} by ${method(o)} — check payment`;
  const text = [
    `${o.customerName} placed order ${o.code}.`,
    `${cod ? `Advance (delivery charge) sent by ${method(o)}: ${tk(o.total)}\nCash to collect on delivery: ${tk(o.codDue)}` : `Paid by ${method(o)}: ${tk(o.total)} (includes ${tk(o.deliveryCharge)} delivery)`}`,
    itemLines(o),
    `Check the Transaction ID in your ${method(o)} app, then approve or reject it in the admin.`,
  ];
  await sendMail(await staffEmails(db, cod), subject, text.join("\n\n"), layout(`New order ${o.code}`, text, { label: "Open orders", href: `${siteUrl()}/admin/orders` }));
}

type CustomerEvent = "paid" | "rejected" | "shipped" | "out_for_delivery" | "delivered" | "returned";
/** Payment decision and each delivery step → the customer (English + Bangla). */
export async function notifyCustomer(db: CatalogDb, orderId: string, event: CustomerEvent) {
  const o = await loadOrder(db, orderId); if (!o) return;
  const cod = o.paymentType === "cod";
  const due = cod ? `\nPlease keep ${tk(o.codDue)} in cash ready for the delivery person.` : "";
  const dueBn = cod ? `\nডেলিভারি ম্যানের জন্য নগদ ${bn(tk(o.codDue))} প্রস্তুত রাখুন।` : "";
  const copy: Record<CustomerEvent, [string, string, string]> = {
    paid: [`Payment confirmed for order ${o.code}`, `Good news! We received your payment and confirmed order ${o.code}. We're preparing it now.${due}`, `সুখবর! আপনার পেমেন্ট পেয়েছি, অর্ডার ${o.code} নিশ্চিত হয়েছে। আমরা এখন প্রস্তুত করছি।${dueBn}`],
    rejected: [`We couldn't confirm the payment for order ${o.code}`, `We couldn't confirm your payment for order ${o.code}.\nReason: ${o.rejectReason ?? "—"}\nIf you already sent money, reply to this email or contact us and we'll sort it out. Nothing was charged to your bag.`, `অর্ডার ${o.code}-এর পেমেন্ট নিশ্চিত করা যায়নি।\nকারণ: ${o.rejectReason ?? "—"}\nটাকা পাঠিয়ে থাকলে এই ইমেইলের উত্তর দিন বা আমাদের সাথে যোগাযোগ করুন, আমরা সমাধান করব।`],
    shipped: [`Order ${o.code} is on its way`, `Your order ${o.code} was handed to ${o.courier ?? "the courier"}${o.trackingCode ? ` (tracking: ${o.trackingCode})` : ""}.${due}`, `আপনার অর্ডার ${o.code} ${o.courier ?? "কুরিয়ার"}-এ দেওয়া হয়েছে${o.trackingCode ? ` (ট্র্যাকিং: ${o.trackingCode})` : ""}।${dueBn}`],
    out_for_delivery: [`Order ${o.code} is out for delivery`, `Your order ${o.code} is out for delivery today. Please keep your phone (${o.phone}) nearby.${due}`, `আপনার অর্ডার ${o.code} আজ ডেলিভারির পথে। ফোনটি (${o.phone}) কাছে রাখুন।${dueBn}`],
    delivered: [`Order ${o.code} delivered`, `Your order ${o.code} has been delivered. Thank you for shopping with OANRO!`, `আপনার অর্ডার ${o.code} পৌঁছে গেছে। OANRO থেকে কেনার জন্য ধন্যবাদ!`],
    returned: [`Order ${o.code} could not be delivered`, `We couldn't deliver order ${o.code} and it came back to us. Contact us if you'd still like it.`, `অর্ডার ${o.code} ডেলিভারি করা যায়নি, ফেরত এসেছে। এখনো চাইলে আমাদের সাথে যোগাযোগ করুন।`],
  };
  const [subject, en, bnText] = copy[event];
  const text = [`Hi ${o.customerName},`, en, event === "paid" ? itemLines(o) : "", `— বাংলা —\n${bnText}`].filter(Boolean);
  await sendMail(o.email, subject, text.join("\n\n"), layout(subject, text, { label: "Track my order", href: `${siteUrl()}/account` }));
}
/** Owner check that email sending works (Orders page button). */
export async function sendTestEmail(to: string) {
  return sendMail(to, "OANRO test email", "Email sending works. Order notifications will arrive from this address.", layout("Email sending works", ["Order notifications will arrive from this address. If this landed in Spam/Junk, mark it as Not spam."]));
}

/** Staff invite email: tells the invited person to sign up (or sign in) with this exact email to join. */
export async function sendStaffInvite(db: CatalogDb, email: string, roleId: string, inviterId: string) {
  const [[r], [inviter]] = await Promise.all([db.select({ name: role.name }).from(role).where(eq(role.id, roleId)).limit(1), db.select({ name: user.name }).from(user).where(eq(user.id, inviterId)).limit(1)]);
  const roleName = r?.name ?? roleId, by = inviter?.name || "The OANRO owner";
  const twoStep = await staffTwoFactorRequired(db).catch(() => false);
  const text = [`${by} invited you to join the OANRO team as ${roleName}.`, `To accept: open the link below and create an account (or sign in) with this email address: ${email}. Verify your email if asked, then open "My account" and you will see the Staff workspace button.`, "The invite is valid for 14 days. If you weren't expecting this, you can ignore this email.",
    ...(twoStep ? [
    "Important: two-step verification is required for all staff. You can't open the Staff workspace until you turn it on. It takes about 2 minutes:",
    "1. Install Google Authenticator (or Microsoft Authenticator / Authy) on your phone.\n2. On the website open My account, then Security, and press \"Turn on two-step verification\". Enter your password. You don't need a code yet.\n3. A QR code appears. In the app tap + and \"Scan a QR code\". (Or choose \"Enter a setup key\", name it OANRO, type the key and pick \"Time-based\", not counter-based.)\n4. Save the backup codes shown, then type the 6-digit code from the app and press \"Turn on\".",
  ] : []),
    `${by} আপনাকে OANRO টিমে ${roleName} হিসেবে যোগ দিতে আমন্ত্রণ জানিয়েছেন।`, `যোগ দিতে: নিচের লিংক খুলে এই ইমেইল দিয়েই (${email}) অ্যাকাউন্ট খুলুন বা সাইন ইন করুন। চাইলে ইমেইল ভেরিফাই করুন, তারপর "My account"-এ Staff workspace বাটন দেখবেন। আমন্ত্রণটি ১৪ দিন বৈধ।`,
    ...(twoStep ? [
    "জরুরি: সব স্টাফের জন্য দুই ধাপের যাচাই (two-step verification) বাধ্যতামূলক। এটি চালু না করলে Staff workspace খুলবে না। মাত্র ২ মিনিট লাগে:",
    "১. ফোনে Google Authenticator (বা Microsoft Authenticator / Authy) ইনস্টল করুন।\n২. ওয়েবসাইটে My account → Security-তে গিয়ে \"দুই ধাপের যাচাই চালু করুন\" চাপুন। পাসওয়ার্ড দিন, এখনো কোনো কোড লাগবে না।\n৩. একটি QR কোড দেখাবে। অ্যাপে + চেপে \"Scan a QR code\" দিয়ে স্ক্যান করুন। (অথবা \"Enter a setup key\" বেছে নিয়ে নাম দিন OANRO, key লিখুন এবং \"Time-based\" বেছে নিন, counter-based নয়।)\n৪. দেখানো backup code-গুলো সেভ করে রাখুন, তারপর অ্যাপের ৬ সংখ্যার কোড লিখে \"চালু করুন\" চাপুন।",
  ] : [])];
  return sendMail(email, `You're invited to join OANRO as ${roleName}`, `${text.join("\n\n")}\n\n${siteUrl()}/sign-in`, layout("You're invited to the OANRO team", text, { label: "Accept invite", href: `${siteUrl()}/sign-in` }));
}

const LEAD_KIND: Record<string, [string, string]> = {
  product: ["Product question", "পণ্য নিয়ে প্রশ্ন"], restock: ["Back-in-stock request", "আবার স্টকে আসার অনুরোধ"], service: ["Service / project inquiry", "সার্ভিস / প্রজেক্ট ইনকোয়ারি"],
  general: ["General message", "সাধারণ বার্তা"], privacy: ["Privacy request", "প্রাইভেসি অনুরোধ"],
};
/** An inquiry was assigned to a team member → tell them by email (skipped when people assign to themselves).
 * Only what they need to pick it up: type, topic, first name and a short preview. Phone and email stay in the admin panel. */
export async function notifyLeadAssigned(db: CatalogDb, leadId: string, assigneeId: string, actorId: string) {
  if (assigneeId === actorId) return false;
  const [l] = await db.select({ kind: lead.kind, subject: lead.subject, productSlug: lead.productSlug, serviceSlug: lead.serviceSlug, name: lead.name, message: lead.message, createdAt: lead.createdAt })
    .from(lead).where(eq(lead.id, leadId)).limit(1);
  const [to] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, assigneeId)).limit(1);
  const [by] = await db.select({ name: user.name }).from(user).where(eq(user.id, actorId)).limit(1);
  if (!l || !to?.email) return false;
  const [kindEn, kindBn] = LEAD_KIND[l.kind] ?? LEAD_KIND.general;
  const topic = l.subject || l.productSlug || l.serviceSlug || "";
  const firstName = l.name.trim().split(/\s+/)[0] ?? "";
  const preview = l.message.trim().replace(/\s+/g, " ").slice(0, 160) + (l.message.trim().length > 160 ? "…" : "");
  const text = [
    `Hi ${to.name || "there"}, ${by?.name || "the OANRO admin"} assigned an inquiry to you.`,
    `Type: ${kindEn}${topic ? `\nAbout: ${topic}` : ""}\nReceived: ${formatDhaka(l.createdAt, "en", { year: true, time: true })} (Bangladesh time)\nFrom: ${firstName}${preview ? `\nMessage: "${preview}"` : ""}`,
    "Please open it in the admin panel, contact the customer and update its status.",
    `একটি ইনকোয়ারি আপনাকে দেওয়া হয়েছে: ${kindBn}${topic ? ` — ${topic}` : ""} (পাওয়া গেছে: ${formatDhaka(l.createdAt, "bn", { year: true, time: true })})। অ্যাডমিন প্যানেলে খুলে গ্রাহকের সাথে যোগাযোগ করুন ও স্ট্যাটাস আপডেট করুন।`,
  ];
  const href = `${siteUrl()}/admin/leads`;
  return sendMail(to.email, `New inquiry assigned to you: ${kindEn}`, `${text.join("\n\n")}\n\n${href}`, layout("An inquiry was assigned to you", text, { label: "Open inquiries", href }));
}
