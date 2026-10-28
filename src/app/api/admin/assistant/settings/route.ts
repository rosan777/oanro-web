import { adminHandler, noStore } from "@/lib/admin-api";
import { getSettings, saveSettings } from "@/lib/assistant/store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Switches (assistant, voice, tracking) and tone/hand-off text. Needs assistant.edit; the server rejects anything else. */
export const PUT = adminHandler("assistant.edit", async (actor, data) => {
  const pick = (k: string) => data[k] === undefined ? undefined : data[k];
  await saveSettings(catalogDb(), actor, { enabled: pick("enabled") as boolean | undefined, voice: pick("voice") as boolean | undefined, tracking: pick("tracking") as boolean | undefined, tone: pick("tone") as string | undefined, handoffNote: pick("handoffNote") as string | undefined });
  return Response.json({ settings: await getSettings(catalogDb()) }, { headers: noStore });
});
