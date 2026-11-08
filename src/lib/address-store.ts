// Saved delivery addresses (account → Addresses, and the picker at checkout). A customer reads and
// changes only their own rows; at most 10 per customer; one default. Orders keep their own copy.

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { customerAddress } from "./db/schema";
import { ProductInputError } from "./product-input";
import { normalizePhone } from "./order-input";
import type { CatalogDb } from "./product-store";

const LIMIT = 10;

export type AddressInput = {
  label: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  city: string;
  postcode: string;
  insideDhaka: boolean;
  isDefault: boolean;
};

function text(data: Record<string, unknown>, field: string, max: number, required = false) {
  const v = data[field];
  if (v === undefined || v === null) {
    if (required) throw new ProductInputError(field);
    return "";
  }
  if (typeof v !== "string") throw new ProductInputError(field);
  const t = v.trim();
  if (t.length > max || (required && !t)) throw new ProductInputError(field);
  return t;
}

/** Validates an address from the browser (same phone rule as orders: 01XXXXXXXXX). */
export function parseAddress(data: Record<string, unknown>): AddressInput {
  const raw = text(data, "phone", 20);
  const phone = raw ? normalizePhone(raw, "phone") : "";
  const address = text(data, "address", 300, true);
  if (address.length < 10) throw new ProductInputError("address");
  return {
    label: text(data, "label", 40),
    name: text(data, "name", 80),
    phone,
    address,
    area: text(data, "area", 80),
    city: text(data, "city", 80),
    postcode: text(data, "postcode", 12),
    insideDhaka: data.insideDhaka === true,
    isDefault: data.isDefault === true,
  };
}

export async function listAddresses(db: CatalogDb, userId: string) {
  return db
    .select({
      id: customerAddress.id,
      label: customerAddress.label,
      name: customerAddress.name,
      phone: customerAddress.phone,
      address: customerAddress.address,
      area: customerAddress.area,
      city: customerAddress.city,
      postcode: customerAddress.postcode,
      insideDhaka: customerAddress.insideDhaka,
      isDefault: customerAddress.isDefault,
    })
    .from(customerAddress)
    .where(eq(customerAddress.userId, userId))
    .orderBy(desc(customerAddress.isDefault), asc(customerAddress.createdAt));
}

/** Creates (no id) or updates (own row only) an address. The first address becomes the default. */
export async function saveAddress(db: CatalogDb, userId: string, input: AddressInput, id?: string) {
  await db.transaction(async tx => {
    const existing = await tx
      .select({ id: customerAddress.id })
      .from(customerAddress)
      .where(eq(customerAddress.userId, userId));
    if (id && !existing.some(r => r.id === id)) throw new Error("NOT_FOUND");
    if (!id && existing.length >= LIMIT) throw new Error("LIMIT_REACHED");
    const makeDefault =
      input.isDefault || existing.length === 0 || (existing.length === 1 && existing[0].id === id);
    const rowId = id ?? randomUUID();
    if (makeDefault)
      await tx
        .update(customerAddress)
        .set({ isDefault: false })
        .where(and(eq(customerAddress.userId, userId), ne(customerAddress.id, rowId)));
    const values = { ...input, isDefault: makeDefault, updatedAt: new Date() };
    if (id)
      await tx
        .update(customerAddress)
        .set(values)
        .where(and(eq(customerAddress.id, id), eq(customerAddress.userId, userId)));
    else await tx.insert(customerAddress).values({ id: rowId, userId, ...values });
  });
  return listAddresses(db, userId);
}

export async function deleteAddress(db: CatalogDb, userId: string, id: string) {
  const gone = await db
    .delete(customerAddress)
    .where(and(eq(customerAddress.id, id), eq(customerAddress.userId, userId)))
    .returning({ isDefault: customerAddress.isDefault });
  if (!gone.length) throw new Error("NOT_FOUND");
  // Keep one default when the default was removed.
  if (gone[0].isDefault) {
    const [first] = await db
      .select({ id: customerAddress.id })
      .from(customerAddress)
      .where(eq(customerAddress.userId, userId))
      .orderBy(asc(customerAddress.createdAt))
      .limit(1);
    if (first)
      await db
        .update(customerAddress)
        .set({ isDefault: true })
        .where(eq(customerAddress.id, first.id));
  }
  return listAddresses(db, userId);
}
