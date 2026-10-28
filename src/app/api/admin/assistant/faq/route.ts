import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { deleteFaq, listFaq, parseFaq, saveFaq } from "@/lib/assistant/store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

const respond = async () => Response.json({ faq: (await listFaq(catalogDb())).map(f => ({ ...f, createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString() })) }, { headers: noStore });
/** Create ({ ...fields }) or edit ({ id, ...fields }) an answer the assistant gives without using AI. */
export const POST = adminHandler("assistant.edit", async (actor, data) => { await saveFaq(catalogDb(), actor, parseFaq(data), data.id ? requireUuid(data.id) : undefined); return respond(); });
export const DELETE = adminHandler("assistant.edit", async (actor, data) => { await deleteFaq(catalogDb(), actor, requireUuid(data.id)); return respond(); });
