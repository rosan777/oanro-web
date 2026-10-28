// Shared assistant types. Pure (no server or React imports) so the browser, the server and tests agree on one shape.
export type Lang = "en" | "bn" | "banglish";
/** How the visitor wants speech recognised. */
export type VoiceLang = "auto" | "bn" | "en";
export type ProviderId = "groq" | "cloudflare" | "cerebras" | "gemini" | "openrouter";

/** A product as the assistant shows it: public, current facts only (never stock counts, costs or drafts). */
export type ProductCard = {
  slug: string; name: string; nameBn: string; category: string; url: string; image: string | null;
  position: string; price: number; compareAt: number | null; inStock: boolean; left: number | null; sizes: string[];
  colors: { id: string; name: string; nameBn: string; hex: string }[];
  /** "color|size" combinations that are sold out (colour is "" for products without colours). */
  soldOut: string[];
  /** True while the store is not live: the item is a preview and its price is not an offer. */
  preview: boolean;
};
export type PolicyFacts = {
  topic: string; deliveryInside: string; deliveryOutside: string; dhakaDays: string; outsideDays: string;
  codLimit: number; returnDays: number; paymentMethods: string[]; text: { en: string; bn: string };
};
export type StoreMode = { live: boolean; checkoutOpen: boolean; notice: { en: string; bn: string } | null };
export type HumanHelp = { contactUrl: string; whatsapp: string; messenger: string; email: string };

export type ChatSource = "ai" | "faq" | "system";
/** What the chat endpoint returns for one visitor message. Everything the UI shows as fact comes from here, not from model prose. */
export type ChatReply = {
  id: string; text: string; language: Lang; source: ChatSource; cards: ProductCard[]; policy: PolicyFacts | null;
  mode: StoreMode; humanHelp: boolean; trackingForm: boolean; quick: string[];
  /** Why the AI could not answer: shown as a short limitation note, never an invented answer. */
  limit: "none" | "quota" | "unavailable" | "off" | "rate" | "unknown";
};
export type ChatRequest = { requestId: string; message: string; locale: "en" | "bn"; recent?: string[]; turnstile?: string };
export type PublicAssistantConfig = {
  enabled: boolean; voice: boolean; tracking: boolean; transcription: boolean; turnstileSiteKey: string;
  human: HumanHelp;
};
export type TrackedOrder = { code: string; stage: string; stageLabel: { en: string; bn: string }; updatedAt: string; courier: string | null; trackingCode: string | null };
