import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { auditEvent, discountCode } from "./db/schema";
import { discountAmount, parseDiscountCode } from "./order-input";
import { ProductInputError } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

export type DiscountRow = typeof discountCode.$inferSelect;
type Tx = Parameters<Parameters<CatalogDb["transaction"]>[0]>[0];

/** Why a code can't be used, or the taka it takes off. Pure check (no write). */
export function checkCode(row: DiscountRow | undefined, subtotal: number, now = new Date()) {
  if (!row || !row.active) return { error: "INVALID" as const };
  if (row.startsAt && now < row.startsAt) return { error: "NOT_STARTED" as const };
  if (row.endsAt && now > row.endsAt) return { error: "EXPIRED" as const };
  if (row.maxUses !== null && row.used >= row.maxUses) return { error: "USED_UP" as const };
  if (subtotal < row.minSubtotal) return { error: "MIN_SUBTOTAL" as const, min: row.minSubtotal };
  return { amount: discountAmount(row.kind, row.value, subtotal) };
}
export async function previewDiscount(db: CatalogDb, rawCode: unknown, subtotal: number) {
  const code = parseDiscountCode(rawCode);
  const [row] = code ? await db.select().from(discountCode).where(eq(discountCode.code, code)).limit(1) : [];
  return { code, ...checkCode(row, subtotal) };
}
/** Inside the order transaction: check again and count one use atomically (two shoppers can't both take the last use). */
export async function redeemDiscount(tx: Tx, code: string, subtotal: number) {
  const [row] = await tx.select().from(discountCode).where(eq(discountCode.code, code)).limit(1);
  const result = checkCode(row, subtotal);
  if ("error" in result) throw new ProductStoreError(`DISCOUNT_${result.error}`);
  const done = await tx.update(discountCode).set({ used: sql`${discountCode.used} + 1` })
    .where(and(eq(discountCode.code, code), or(isNull(discountCode.maxUses), lt(discountCode.used, sql`${discountCode.maxUses}`)))).returning({ code: discountCode.code });
  if (!done.length) throw new ProductStoreError("DISCOUNT_USED_UP");
  return result.amount;
}

export type DiscountInput = { code: string; kind: "percent" | "amount"; value: number; minSubtotal: number; maxUses: number | null; startsAt: Date | null; endsAt: Date | null; active: boolean; note: string };
export function parseDiscountInput(d: Record<string, unknown>): DiscountInput {
  const code = parseDiscountCode(d.code); if (!code) throw new ProductInputError("code");
  if (d.kind !== "percent" && d.kind !== "amount") throw new ProductInputError("kind");
  const int = (v: unknown, f: string, min: number, max: number) => { if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) throw new ProductInputError(f); return v as number; };
  const value = int(d.value, "value", 1, d.kind === "percent" ? 90 : 1_000_000);
  const date = (v: unknown, f: string) => { if (v === null || v === undefined || v === "") return null; const t = new Date(String(v)); if (Number.isNaN(t.getTime())) throw new ProductInputError(f); return t; };
  const startsAt = date(d.startsAt, "startsAt"), endsAt = date(d.endsAt, "endsAt");
  if (startsAt && endsAt && endsAt <= startsAt) throw new ProductInputError("endsAt");
  return { code, kind: d.kind, value, minSubtotal: d.minSubtotal === undefined || d.minSubtotal === "" ? 0 : int(d.minSubtotal, "minSubtotal", 0, 10_000_000),
    maxUses: d.maxUses === null || d.maxUses === undefined || d.maxUses === "" ? null : int(d.maxUses, "maxUses", 1, 1_000_000),
    startsAt, endsAt, active: d.active !== false, note: typeof d.note === "string" ? d.note.trim().slice(0, 120) : "" };
}
export const listDiscounts = (db: CatalogDb) => db.select().from(discountCode).orderBy(desc(discountCode.createdAt));
export async function saveDiscount(db: CatalogDb, actorId: string, input: DiscountInput) {
  await db.transaction(async tx => {
    await tx.insert(discountCode).values({ ...input, createdBy: actorId })
      .onConflictDoUpdate({ target: discountCode.code, set: { kind: input.kind, value: input.value, minSubtotal: input.minSubtotal, maxUses: input.maxUses, startsAt: input.startsAt, endsAt: input.endsAt, active: input.active, note: input.note } });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "discount.save", targetId: input.code, reason: `${input.kind === "percent" ? `${input.value}%` : `৳${input.value}`} off${input.active ? "" : " (off)"}` });
  });
}
export async function setDiscountActive(db: CatalogDb, actorId: string, code: string, active: boolean) {
  await db.transaction(async tx => {
    const done = await tx.update(discountCode).set({ active }).where(eq(discountCode.code, code)).returning({ code: discountCode.code });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "discount.toggle", targetId: code, reason: active ? "on" : "off" });
  });
}
