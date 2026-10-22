// Pure validation for checkout. Shared by the order API and tests; no server-only imports.
import { ProductInputError, slugPattern } from "./product-input";
import type { PaymentMethod, PaymentType } from "./db/schema";

/** color is the colour id ("" for products without colours). */
export type CartLine = { slug: string; size: string; color: string; quantity: number };
export type OrderInput = {
  items: CartLine[]; paymentType: PaymentType; method: PaymentMethod; payerNumber: string; trxId: string;
  name: string; phone: string; address: string; note: string; expectedTotal: number; deliveryArea: "dhaka" | "outside";
  /** Optional discount code typed at checkout (upper-case, letters/numbers/dash). */
  discountCode: string;
};
/** Bangladeshi mobile numbers: 01[3-9] + 8 digits. Accepts +880 / 880 prefixes, spaces and dashes. */
export function normalizePhone(value: unknown, field: string) {
  if (typeof value !== "string") throw new ProductInputError(field);
  const digits = value.replace(/[\s-]/g, "").replace(/^\+?88/, "");
  if (!/^01[3-9]\d{8}$/.test(digits)) throw new ProductInputError(field);
  return digits;
}
function text(value: unknown, field: string, min: number, max: number) {
  if (value === undefined && min === 0) return "";
  if (typeof value !== "string") throw new ProductInputError(field);
  const clean = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (clean.length < min || clean.length > max) throw new ProductInputError(field);
  return clean;
}
export function parseOrderInput(data: Record<string, unknown>): OrderInput {
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 20) throw new ProductInputError("items");
  const merged = new Map<string, CartLine>();
  for (const raw of data.items) {
    const item = raw as Record<string, unknown>;
    if (!item || typeof item.slug !== "string" || !slugPattern.test(item.slug) || item.slug.length > 60
      || typeof item.size !== "string" || !item.size.trim() || item.size.length > 20
      || !Number.isInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 10
      || (item.color !== undefined && (typeof item.color !== "string" || !/^[a-z0-9-]{0,30}$/.test(item.color)))) throw new ProductInputError("items");
    const color = typeof item.color === "string" ? item.color : "";
    const key = `${item.slug}\u0000${item.size}\u0000${color}`;
    const line = merged.get(key) ?? { slug: item.slug, size: item.size.trim(), color, quantity: 0 };
    line.quantity = Math.min(10, line.quantity + (item.quantity as number));
    merged.set(key, line);
  }
  if (data.paymentType !== undefined && data.paymentType !== "prepaid" && data.paymentType !== "cod") throw new ProductInputError("paymentType");
  if (data.method !== "bkash" && data.method !== "nagad") throw new ProductInputError("method");
  const trxId = typeof data.trxId === "string" ? data.trxId.replace(/\s/g, "").toUpperCase() : "";
  if (!/^[A-Z0-9]{6,20}$/.test(trxId)) throw new ProductInputError("trxId");
  // Older pages that do not send an area count as inside Dhaka.
  if (data.deliveryArea !== undefined && data.deliveryArea !== "dhaka" && data.deliveryArea !== "outside") throw new ProductInputError("deliveryArea");
  if (!Number.isInteger(data.expectedTotal) || (data.expectedTotal as number) < 0) throw new ProductInputError("expectedTotal");
  return {
    items: [...merged.values()], method: data.method, trxId, paymentType: data.paymentType === "cod" ? "cod" : "prepaid",
    payerNumber: normalizePhone(data.payerNumber, "payerNumber"), phone: normalizePhone(data.phone, "phone"),
    name: text(data.name, "name", 2, 80), address: text(data.address, "address", 10, 300), note: text(data.note, "note", 0, 300),
    expectedTotal: data.expectedTotal as number, deliveryArea: data.deliveryArea === "outside" ? "outside" : "dhaka", discountCode: parseDiscountCode(data.discountCode),
  };
}
/** Common couriers in Bangladesh, offered as quick picks (any name can be typed). */
export const couriers = ["Pathao Courier", "Steadfast Courier", "RedX", "Sundarban Courier", "SA Paribahan", "eCourier", "Paperfly", "Delivery Tiger", "OANRO self-delivery"];
/** "", or 3-20 letters/numbers/dashes, upper-cased. */
export function parseDiscountCode(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new ProductInputError("discountCode");
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) throw new ProductInputError("discountCode");
  return code;
}
/** Discount for a subtotal: whole taka, never more than the subtotal. */
export function discountAmount(kind: "percent" | "amount", value: number, subtotal: number) {
  return Math.max(0, Math.min(subtotal, kind === "percent" ? Math.floor(subtotal * value / 100) : value));
}
