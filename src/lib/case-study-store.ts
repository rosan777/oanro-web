// Studio case studies (portfolio). Written by staff with content.manage; nothing is public until a case
// study is published. A client's name is shown only when "client agreed" is ticked. No sample or invented
// case studies exist: the public Studio page falls back to the company profile's portfolio notice.

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { auditEvent, caseStudy } from "./db/schema";
import { ProductInputError, slugPattern } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";
import { validateUploadedImage } from "./pulse-upload";

export type CaseStudyInput = {
  slug: string;
  status: "draft" | "published" | "hidden";
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  problemEn: string;
  problemBn: string;
  approachEn: string;
  approachBn: string;
  outcomeEn: string;
  outcomeBn: string;
  clientName: string;
  clientConsent: boolean;
  tags: string[];
  technologies: string[];
  externalUrl: string;
  imageAlt: string;
  displayOrder: number;
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
function list(data: Record<string, unknown>, field: string) {
  const v = data[field];
  const items = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const out = items.map(x => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  if (out.length > 12 || out.some(x => x.length > 40)) throw new ProductInputError(field);
  return [...new Set(out)];
}

export function parseCaseStudy(data: Record<string, unknown>): CaseStudyInput {
  const slug = text(data, "slug", 60, true).toLowerCase();
  if (slug.length < 2 || !slugPattern.test(slug)) throw new ProductInputError("slug");
  const status = data.status ?? "draft";
  if (status !== "draft" && status !== "published" && status !== "hidden")
    throw new ProductInputError("status");
  const externalUrl = text(data, "externalUrl", 300);
  if (externalUrl && !/^https:\/\/[^\s]+$/i.test(externalUrl))
    throw new ProductInputError("externalUrl");
  const order = Number(data.displayOrder ?? 0);
  return {
    slug,
    status,
    titleEn: text(data, "titleEn", 120, true),
    titleBn: text(data, "titleBn", 120),
    summaryEn: text(data, "summaryEn", 400),
    summaryBn: text(data, "summaryBn", 400),
    problemEn: text(data, "problemEn", 2000),
    problemBn: text(data, "problemBn", 2000),
    approachEn: text(data, "approachEn", 2000),
    approachBn: text(data, "approachBn", 2000),
    outcomeEn: text(data, "outcomeEn", 2000),
    outcomeBn: text(data, "outcomeBn", 2000),
    clientName: text(data, "clientName", 120),
    clientConsent: data.clientConsent === true,
    tags: list(data, "tags"),
    technologies: list(data, "technologies"),
    externalUrl,
    imageAlt: text(data, "imageAlt", 200),
    displayOrder: Number.isInteger(order) ? Math.max(0, Math.min(10_000, order)) : 0,
  };
}

const audit = (
  db: Pick<CatalogDb, "insert">,
  actorId: string,
  action: string,
  targetId: string,
  reason: string,
) =>
  db
    .insert(auditEvent)
    .values({ id: randomUUID(), actorId, action, targetId, reason: reason.slice(0, 300) });

/** Published case studies for the public Studio page (client name only with consent). */
export async function listPublishedCaseStudies(db: CatalogDb) {
  const rows = await db
    .select()
    .from(caseStudy)
    .where(eq(caseStudy.status, "published"))
    .orderBy(asc(caseStudy.displayOrder), asc(caseStudy.createdAt));
  // Who wrote or edited a case study is internal: the public list leaves those fields out.
  return rows.map(r => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    titleEn: r.titleEn,
    titleBn: r.titleBn,
    summaryEn: r.summaryEn,
    summaryBn: r.summaryBn,
    problemEn: r.problemEn,
    problemBn: r.problemBn,
    approachEn: r.approachEn,
    approachBn: r.approachBn,
    outcomeEn: r.outcomeEn,
    outcomeBn: r.outcomeBn,
    tags: r.tags,
    technologies: r.technologies,
    externalUrl: r.externalUrl,
    imageAlt: r.imageAlt,
    clientName: r.clientConsent ? r.clientName : "",
    image: r.imageData ? `/api/case-studies/${r.slug}/image?v=${r.updatedAt.getTime()}` : null,
  }));
}

/** Every case study for the editor (content.manage), without the image bytes. */
export async function listAllCaseStudies(db: CatalogDb) {
  const rows = await db
    .select()
    .from(caseStudy)
    .orderBy(asc(caseStudy.displayOrder), asc(caseStudy.createdAt));
  return rows.map(({ imageData, ...r }) => ({ ...r, hasImage: Boolean(imageData) }));
}

export async function publishedCaseStudyImage(db: CatalogDb, slug: string) {
  const [row] = await db
    .select({ imageData: caseStudy.imageData })
    .from(caseStudy)
    .where(and(eq(caseStudy.slug, slug), eq(caseStudy.status, "published")))
    .limit(1);
  return row?.imageData ?? null;
}

/** Creates (no id) or updates a case study. image: undefined keeps, null removes, data URL replaces. */
export async function saveCaseStudy(
  db: CatalogDb,
  actorId: string,
  input: CaseStudyInput,
  image: unknown,
  id?: string,
) {
  const imageData =
    image === undefined ? undefined : image === null ? null : validateUploadedImage(image);
  const [taken] = await db
    .select({ id: caseStudy.id })
    .from(caseStudy)
    .where(eq(caseStudy.slug, input.slug))
    .limit(1);
  if (taken && taken.id !== id) throw new ProductStoreError("SLUG_TAKEN");
  const rowId = id ?? randomUUID();
  await db.transaction(async tx => {
    if (id) {
      const done = await tx
        .update(caseStudy)
        .set({
          ...input,
          ...(imageData !== undefined ? { imageData } : {}),
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(caseStudy.id, id))
        .returning({ id: caseStudy.id });
      if (!done.length) throw new ProductStoreError("NOT_FOUND");
    } else
      await tx.insert(caseStudy).values({
        id: rowId,
        ...input,
        imageData: imageData ?? null,
        createdBy: actorId,
        updatedBy: actorId,
      });
    await audit(
      tx,
      actorId,
      id ? "case-study.update" : "case-study.create",
      rowId,
      `${input.slug} (${input.status})`,
    );
  });
  return rowId;
}

export async function deleteCaseStudy(db: CatalogDb, actorId: string, id: string) {
  const gone = await db
    .delete(caseStudy)
    .where(eq(caseStudy.id, id))
    .returning({ slug: caseStudy.slug });
  if (!gone.length) throw new ProductStoreError("NOT_FOUND");
  await audit(db, actorId, "case-study.delete", id, gone[0].slug);
}
