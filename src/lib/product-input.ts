// Pure validation for owner catalog edits (products, sections, services). Shared by the admin API and tests; no server-only imports.
import { collectionPresets, type CollectionPreset } from "./categories";
import { fromDhakaInput } from "./dhaka-time";
export const productStatuses = ["draft", "published", "hidden"] as const;
export type ProductStatus = typeof productStatuses[number];

export type ProductInput = {
  slug: string; status: ProductStatus; collectionId: string;
  nameEn: string; nameBn: string; categoryEn: string; categoryBn: string;
  taglineEn: string; taglineBn: string; descriptionEn: string; descriptionBn: string;
  price: number; stock: number | null; sizes: string[];
  specsEn: [string, string][]; specsBn: [string, string][]; displayOrder: number;
};
export class ProductInputError extends Error {
  readonly field: string;
  constructor(field: string) { super(`INVALID_${field.toUpperCase()}`); this.field = field; }
}
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Strip control characters other than newlines/tabs, trim, and enforce a length cap.
function text(data: Record<string, unknown>, field: string, max: number, required = false) {
  const value = data[field] ?? "";
  if (typeof value !== "string") throw new ProductInputError(field);
  const clean = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (clean.length > max || (required && !clean)) throw new ProductInputError(field);
  return clean;
}
function int(value: unknown, field: string, min: number, max: number) {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) throw new ProductInputError(field);
  return n;
}
/** Accepts an array of [label, value] pairs or text with one "Label: Value" per line. */
function specs(value: unknown, field: string): [string, string][] {
  const rows = typeof value === "string" ? value.split(/\r?\n/).filter(line => line.trim()).map(line => {
    const at = line.indexOf(":"); return at > 0 ? [line.slice(0, at), line.slice(at + 1)] : null;
  }) : value ?? [];
  if (!Array.isArray(rows) || rows.length > 12) throw new ProductInputError(field);
  return rows.map(row => {
    if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== "string" || typeof row[1] !== "string") throw new ProductInputError(field);
    const pair: [string, string] = [row[0].trim(), row[1].trim()];
    if (!pair[0] || !pair[1] || pair[0].length > 40 || pair[1].length > 160) throw new ProductInputError(field);
    return pair;
  });
}
export const idPattern = /^[a-z0-9-]{1,40}$/;
function slugField(data: Record<string, unknown>) {
  const slug = text(data, "slug", 60, true).toLowerCase();
  if (slug.length < 2 || !slugPattern.test(slug)) throw new ProductInputError("slug");
  return slug;
}
function statusField(data: Record<string, unknown>) {
  const status = data.status ?? "draft";
  if (typeof status !== "string" || !productStatuses.includes(status as ProductStatus)) throw new ProductInputError("status");
  return status as ProductStatus;
}
const order = (data: Record<string, unknown>) => data.displayOrder === undefined || data.displayOrder === "" ? 0 : int(data.displayOrder, "displayOrder", -1000, 1000);
function sizes(value: unknown): string[] {
  const list = typeof value === "string" ? value.split(",") : value;
  if (!Array.isArray(list)) throw new ProductInputError("sizes");
  const clean = [...new Set(list.map(item => typeof item === "string" ? item.trim() : ""))].filter(Boolean);
  if (list.some(item => typeof item !== "string") || clean.length < 1 || clean.length > 12 || clean.some(item => item.length > 20)) throw new ProductInputError("sizes");
  return clean;
}
export function parseProductInput(data: Record<string, unknown>): ProductInput {
  const slug = slugField(data), status = statusField(data);
  const collectionId = data.collectionId ?? "seasonal";
  if (typeof collectionId !== "string" || !idPattern.test(collectionId)) throw new ProductInputError("collectionId");
  const stock = data.stock === null || data.stock === undefined || data.stock === "" ? null : int(data.stock, "stock", 0, 1_000_000);
  return {
    slug, status, collectionId,
    nameEn: text(data, "nameEn", 80, true), nameBn: text(data, "nameBn", 80),
    categoryEn: text(data, "categoryEn", 60), categoryBn: text(data, "categoryBn", 60),
    taglineEn: text(data, "taglineEn", 140), taglineBn: text(data, "taglineBn", 140),
    descriptionEn: text(data, "descriptionEn", 2000), descriptionBn: text(data, "descriptionBn", 2000),
    price: int(data.price, "price", 0, 10_000_000), stock, sizes: sizes(data.sizes),
    specsEn: specs(data.specsEn, "specsEn"), specsBn: specs(data.specsBn, "specsBn"),
    displayOrder: order(data),
  };
}
export type CollectionInput = {
  slug: string; status: ProductStatus; preset: CollectionPreset; nameEn: string; nameBn: string;
  headlineEn: string; headlineBn: string; descriptionEn: string; descriptionBn: string; displayOrder: number;
};
export function parseCollectionInput(data: Record<string, unknown>): CollectionInput {
  const preset = data.preset ?? "general";
  if (typeof preset !== "string" || !collectionPresets.includes(preset as CollectionPreset)) throw new ProductInputError("preset");
  return {
    slug: slugField(data), status: statusField(data), preset: preset as CollectionPreset,
    nameEn: text(data, "nameEn", 60, true), nameBn: text(data, "nameBn", 60),
    headlineEn: text(data, "headlineEn", 100), headlineBn: text(data, "headlineBn", 100),
    descriptionEn: text(data, "descriptionEn", 300), descriptionBn: text(data, "descriptionBn", 300), displayOrder: order(data),
  };
}
export type ServiceInput = {
  slug: string; status: ProductStatus; titleEn: string; titleBn: string; word: string; categoryEn: string; categoryBn: string;
  summaryEn: string; summaryBn: string; detailEn: string; detailBn: string; displayOrder: number;
};
export function parseServiceInput(data: Record<string, unknown>): ServiceInput {
  return {
    slug: slugField(data), status: statusField(data),
    titleEn: text(data, "titleEn", 80, true), titleBn: text(data, "titleBn", 80), word: text(data, "word", 12).toUpperCase(),
    categoryEn: text(data, "categoryEn", 60), categoryBn: text(data, "categoryBn", 60),
    summaryEn: text(data, "summaryEn", 160), summaryBn: text(data, "summaryBn", 160),
    detailEn: text(data, "detailEn", 800), detailBn: text(data, "detailBn", 800), displayOrder: order(data),
  };
}
export function slugify(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
export type CampaignInput = {
  slug: string; status: ProductStatus; nameEn: string; nameBn: string; headlineEn: string; headlineBn: string;
  descriptionEn: string; descriptionBn: string; startsAt: Date | null; endsAt: Date | null; displayOrder: number;
};
/** startsAt/endsAt arrive as Dhaka-time "YYYY-MM-DDTHH:mm" strings (or empty for "no limit"). */
export function parseCampaignInput(data: Record<string, unknown>): CampaignInput {
  const when = (field: "startsAt" | "endsAt") => {
    const value = data[field] ?? "";
    if (typeof value !== "string") throw new ProductInputError(field);
    try { return fromDhakaInput(value); } catch { throw new ProductInputError(field); }
  };
  const startsAt = when("startsAt"), endsAt = when("endsAt");
  if (startsAt && endsAt && endsAt <= startsAt) throw new ProductInputError("endsAt");
  return {
    slug: slugField(data), status: statusField(data), nameEn: text(data, "nameEn", 80, true), nameBn: text(data, "nameBn", 80),
    headlineEn: text(data, "headlineEn", 120), headlineBn: text(data, "headlineBn", 120),
    descriptionEn: text(data, "descriptionEn", 400), descriptionBn: text(data, "descriptionBn", 400), startsAt, endsAt, displayOrder: order(data),
  };
}

// ---- Customer inquiries (public input: strict limits, at least one way to reply, explicit consent)
export const leadContactMethods = ["phone", "whatsapp", "email", "messenger"] as const;
export const privacyRequestTypes = ["access", "correct", "delete"] as const;
export type LeadInput = {
  kind: "product" | "restock" | "service" | "general" | "privacy"; productSlug: string | null; serviceSlug: string | null;
  subject: string; size: string | null; quantity: number | null; name: string; phone: string; email: string; message: string;
  preferredContact: typeof leadContactMethods[number]; locale: "en" | "bn";
};
export function parseLeadInput(data: Record<string, unknown>): LeadInput {
  const kind = data.kind;
  if (typeof kind !== "string" || !["product", "restock", "service", "general", "privacy"].includes(kind)) throw new ProductInputError("kind");
  if (data.consent !== true) throw new ProductInputError("consent");
  const phone = text(data, "phone", 20);
  if (phone && !/^\+?[0-9][0-9 -]{6,18}$/.test(phone)) throw new ProductInputError("phone");
  const email = text(data, "email", 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ProductInputError("email");
  if (!phone && !email) throw new ProductInputError("phone");
  const preferred = data.preferredContact ?? (phone ? "phone" : "email");
  if (typeof preferred !== "string" || !leadContactMethods.includes(preferred as LeadInput["preferredContact"])) throw new ProductInputError("preferredContact");
  const slug = (field: "productSlug" | "serviceSlug", required: boolean) => {
    const v = data[field];
    if (v === undefined || v === null || v === "") { if (required) throw new ProductInputError(field); return null; }
    if (typeof v !== "string" || v.length > 60 || !slugPattern.test(v)) throw new ProductInputError(field);
    return v;
  };
  const productSlug = slug("productSlug", kind === "product" || kind === "restock");
  let subject = "";
  if (kind === "privacy") {
    if (typeof data.requestType !== "string" || !privacyRequestTypes.includes(data.requestType as typeof privacyRequestTypes[number])) throw new ProductInputError("requestType");
    subject = `privacy:${data.requestType}`;
  }
  const quantity = productSlug && data.quantity !== undefined && data.quantity !== "" ? int(data.quantity, "quantity", 1, 100) : null;
  const size = productSlug ? text(data, "size", 20) || null : null;
  return {
    kind: kind as LeadInput["kind"], productSlug, serviceSlug: slug("serviceSlug", kind === "service"), subject, size, quantity,
    name: text(data, "name", 80, true), phone, email, message: text(data, "message", 1000, kind === "general" || kind === "service" || kind === "privacy"),
    preferredContact: preferred as LeadInput["preferredContact"], locale: data.locale === "bn" ? "bn" : "en",
  };
}
