import { formatPrice } from "./catalog";

// Delivery charge depends on where the order goes. Pure helpers, safe in the browser.
export type DeliveryArea = "dhaka" | "outside";
type Fees = { deliveryCharge: number; outsideCharge: number };
export const chargeFor = (rules: Fees, area: DeliveryArea) => area === "outside" ? rules.outsideCharge : rules.deliveryCharge;
/** "৳120" when both areas cost the same, otherwise "৳80 inside Dhaka, ৳150 outside Dhaka". */
export function feeText(rules: Fees, locale: "en" | "bn") {
  const a = formatPrice(rules.deliveryCharge, locale), b = formatPrice(rules.outsideCharge, locale);
  if (rules.deliveryCharge === rules.outsideCharge) return a;
  return locale === "bn" ? `ঢাকায় ${a}, ঢাকার বাইরে ${b}` : `${a} inside Dhaka, ${b} outside Dhaka`;
}
export const areaLabel = (area: string, locale: "en" | "bn" = "en") => area === "outside" ? (locale === "bn" ? "ঢাকার বাইরে" : "Outside Dhaka") : (locale === "bn" ? "ঢাকার ভেতরে" : "Inside Dhaka");
