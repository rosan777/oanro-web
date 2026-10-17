import { sql, type AnyColumn } from "drizzle-orm";
/**
 * Column set for list queries: every column except the stored photo, which is replaced by a tiny
 * marker ('1' when a photo exists, null otherwise). Photos are base64 (up to ~190 KB each), so
 * selecting them in lists made every page download megabytes from the database.
 */
export function withImageFlag<C extends { imageData: AnyColumn }>(cols: C) {
  const rest: Partial<C> = { ...cols };
  delete rest.imageData;
  return { ...(rest as Omit<C, "imageData">), imageData: sql<string | null>`case when ${cols.imageData} is null then null else '1' end` };
}
