import "server-only";
import { cache } from "react";
import { DEFAULT_RULES, getCheckoutRules } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
import { storefrontCached } from "@/lib/storefront-cache";

// Shared across visits for up to 60 s; saving rules in admin clears it at once (storefrontChanged).
const cachedRules = storefrontCached("checkout-rules", () => getCheckoutRules(catalogDb()));

/** The owner's delivery and payment rules from admin, for public trust messages. Same source as the Delivery & Returns page. */
export const publicRules = cache(async () => process.env.DATABASE_URL ? await cachedRules().catch(() => DEFAULT_RULES) : DEFAULT_RULES);

export const bnDigits = (s: string) => s.replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
export const dayText = (range: string) => range.replace("-", "–");
