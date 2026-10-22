"use client";

import { useEffect, useState } from "react";
import { RotateCcw, ShoppingBag, Truck } from "lucide-react";
import type { Product } from "@/lib/catalog";
import type { CheckoutRules } from "@/lib/order-store";
import { formatPrice } from "@/lib/catalog";
import { bnDigits, dayText } from "@/lib/text-format";
import { useLocale } from "./locale";
import { PriceTag } from "./shell";
import Link from "./locale-link";

const DAY_MS = 86_400_000;
/** "1-3" business days from today in Bangladesh time → "Fri 24 – Sun 26 Oct" (Friday is skipped as a non-delivery day). */
function arrival(range: string, bn: boolean) {
  const [a, b = a] = range.split("-").map(n => Number(n.trim()) || 0);
  const add = (n: number) => { const d = new Date(Date.now() + 6 * 3600_000); let left = n; while (left > 0) { d.setTime(d.getTime() + DAY_MS); if (d.getUTCDay() !== 5) left--; } return d; };
  const fmt = (d: Date) => new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  return a === b ? fmt(add(a)) : `${fmt(add(a))} – ${fmt(add(b))}`;
}

/** Under the buy button: full price with delivery, when it arrives, honest low-stock note, and the return promise. */
export function BuyBox({ product, rules, soldOut }: { product: Product; rules: CheckoutRules; soldOut: boolean }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const [area, setArea] = useState<"dhaka" | "outside">("dhaka");
  // Dates depend on today, so they are only shown after the page is in the browser (no server/browser mismatch).
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setReady(true), []);
  const days = area === "dhaka" ? rules.dhakaDays : rules.outsideDays;
  const n = (s: string) => bn ? bnDigits(s) : s;
  return <div className="buy-box">
    {product.left && !soldOut ? <p className="buy-left" role="status">{t(`Only ${product.left} left`, `মাত্র ${bnDigits(String(product.left))}টি বাকি`)}</p> : null}
    <p className="buy-total">{formatPrice(product.price, locale)} <span>+ {formatPrice(rules.deliveryCharge, locale)} {t("delivery", "ডেলিভারি")}</span> = <b>{formatPrice(product.price + rules.deliveryCharge, locale)}</b></p>
    <div className="buy-ship">
      <Truck size={18} aria-hidden="true" />
      <div>
        <div className="buy-areas" role="group" aria-label={t("Delivery area", "ডেলিভারির এলাকা")}>
          <button type="button" aria-pressed={area === "dhaka"} onClick={() => setArea("dhaka")}>{t("Inside Dhaka", "ঢাকার ভেতরে")}</button>
          <button type="button" aria-pressed={area === "outside"} onClick={() => setArea("outside")}>{t("Outside Dhaka", "ঢাকার বাইরে")}</button>
        </div>
        <p>{ready ? <>{t("Order today → arrives ", "আজ অর্ডার করলে পৌঁছাবে ")}<b>{arrival(days, bn)}</b></> : <>{t(`Arrives in ${dayText(days)} days`, `${n(dayText(days))} দিনে পৌঁছায়`)}</>}</p>
      </div>
    </div>
    {rules.returnDays > 0 && <p className="buy-return"><RotateCcw size={16} aria-hidden="true" />{t(`Wrong or damaged? Tell us within ${rules.returnDays} days and we fix it.`, `ভুল বা ক্ষতিগ্রস্ত? ${bnDigits(String(rules.returnDays))} দিনের মধ্যে জানালে আমরা ঠিক করে দিই।`)} <Link href="/delivery-returns">{t("Details", "বিস্তারিত")}</Link></p>}
  </div>;
}

/** Phones: price and "Add to bag" stay at the bottom once the main button scrolls out of view. */
export function StickyBuy({ product, soldOut }: { product: Product; soldOut: boolean }) {
  const { locale } = useLocale(); const bn = locale === "bn";
  const [show, setShow] = useState(false);
  useEffect(() => {
    const main = document.querySelector(".add-to-bag"); if (!main) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(main); return () => io.disconnect();
  }, []);
  return <div className={`sticky-buy${show ? " is-shown" : ""}`} aria-hidden={!show}>
    <div className="sticky-buy-info"><strong>{bn && product.bn ? product.bn.name : product.name}</strong><PriceTag price={product.price} compareAt={product.compareAt} locale={locale} /></div>
    <button type="button" className="button brand-button" disabled={soldOut} tabIndex={show ? undefined : -1}
      onClick={() => (document.querySelector(".add-to-bag") as HTMLButtonElement | null)?.click()}>
      <ShoppingBag size={16} />{soldOut ? (bn ? "স্টক শেষ" : "Out of stock") : bn ? "ব্যাগে যোগ করুন" : "Add to bag"}</button>
  </div>;
}
