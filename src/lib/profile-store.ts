// Customer profile: validation and storage. The account name lives on auth_user; the rest here.
import { eq } from "drizzle-orm";
import { customerProfile, user } from "./db/schema";
import { normalizePhone } from "./order-input";
import { ProductInputError } from "./product-input";
import type { CatalogDb } from "./product-store";

export type Profile = { name: string; phone: string; altPhone: string; address: string; area: string; city: string; postcode: string; permanentAddress: string; company: string };
const empty = { phone: "", altPhone: "", address: "", area: "", city: "", postcode: "", permanentAddress: "", company: "" };
function text(value: unknown, field: string, max: number, min = 0) {
  if (value == null) value = "";
  if (typeof value !== "string") throw new ProductInputError(field);
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length > max || clean.length < min) throw new ProductInputError(field);
  return clean;
}
export function parseProfile(data: Record<string, unknown>): Profile {
  const optionalPhone = (v: unknown, f: string) => v == null || v === "" ? "" : normalizePhone(v, f);
  const postcode = text(data.postcode, "postcode", 4);
  if (postcode && !/^\d{4}$/.test(postcode)) throw new ProductInputError("postcode");
  return {
    name: text(data.name, "name", 80, 2), phone: optionalPhone(data.phone, "phone"), altPhone: optionalPhone(data.altPhone, "altPhone"),
    address: text(data.address, "address", 200), area: text(data.area, "area", 80), city: text(data.city, "city", 60), postcode,
    permanentAddress: text(data.permanentAddress, "permanentAddress", 300), company: text(data.company, "company", 100),
  };
}
export async function getProfile(db: CatalogDb, userId: string): Promise<Profile> {
  const [row] = await db.select({ name: user.name, p: customerProfile }).from(user).leftJoin(customerProfile, eq(customerProfile.userId, user.id)).where(eq(user.id, userId)).limit(1);
  if (!row) return { name: "", ...empty };
  const p = row.p ?? empty;
  return { name: row.name, phone: p.phone, altPhone: p.altPhone, address: p.address, area: p.area, city: p.city, postcode: p.postcode, permanentAddress: p.permanentAddress, company: p.company };
}
export async function saveProfile(db: CatalogDb, userId: string, profile: Profile) {
  const { name, ...rest } = profile;
  await db.transaction(async tx => {
    await tx.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, userId));
    await tx.insert(customerProfile).values({ userId, ...rest }).onConflictDoUpdate({ target: customerProfile.userId, set: { ...rest, updatedAt: new Date() } });
  });
}
/** One-line delivery address for checkout prefill. */
export const fullAddress = (p: Profile) => [p.address, p.area, p.city && (p.postcode ? `${p.city} ${p.postcode}` : p.city)].filter(Boolean).join(", ");
