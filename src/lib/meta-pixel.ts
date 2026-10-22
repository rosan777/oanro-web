// Meta (Facebook/Instagram) Pixel events. Every call is a no-op unless the Pixel has loaded,
// which only happens when the owner switched it on and the visitor allowed Analytics.
type Fbq = (...args: unknown[]) => void;
const fbq = () => (typeof window === "undefined" ? undefined : (window as unknown as { fbq?: Fbq }).fbq);
export type PixelEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Search" | "Lead";
/** eventId lets Meta match this browser event with the same event sent from our server (no double counting). */
export function track(event: PixelEvent, data: Record<string, unknown> = {}, eventId?: string) {
  fbq()?.("track", event, { currency: "BDT", ...data }, eventId ? { eventID: eventId } : undefined);
}
