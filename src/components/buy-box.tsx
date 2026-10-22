"use client";

import { useEffect, useState } from "react";
import { RotateCcw, ShoppingBag, Truck } from "lucide-react";
import type { Product } from "@/lib/catalog";
import type { CheckoutRules } from "@/lib/order-store";
import { formatPrice } from "@/lib/catalog";
import { bnDigits, dayText } from "@/lib/text-format";
import { useLocale } from "./locale";
import { PriceTag, ProductPhoto } from "./shell";
import Link from "./locale-link";
import { useFeature } from "./site-content-context";
import { chargeFor } from "@/lib/delivery-fee";

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
  const enabled = useFeature("buyBox");
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const [area, setArea] = useState<"dhaka" | "outside">("dhaka");
  // Dates depend on today, so they are only shown after the page is in the browser (no server/browser mismatch).
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setReady(true), []);
  const days = area === "dhaka" ? rules.dhakaDays : rules.outsideDays;
  const fee = chargeFor(rules, area);
  const n = (s: string) => bn ? bnDigits(s) : s;
  if (!enabled) return null;
  return <div className="buy-box">
    {product.left && !soldOut ? <p className="buy-left" role="status">{t(`Only ${product.left} left`, `মাত্র ${bnDigits(String(product.left))}টি বাকি`)}</p> : null}
    <p className="buy-total">{formatPrice(product.price, locale)} <span>+ {formatPrice(fee, locale)} {t("delivery", "ডেলিভারি")}</span> = <b>{formatPrice(product.price + fee, locale)}</b></p>
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
  const enabled = useFeature("stickyBuy");
  const { locale } = useLocale(); const bn = locale === "bn";
  const [show, setShow] = useState(false);
  useEffect(() => {
    const main = document.querySelector(".add-to-bag"); if (!main) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(main); return () => io.disconnect();
  }, []);
  if (!enabled) return null;
  return <div className={`sticky-buy${show ? " is-shown" : ""}`} aria-hidden={!show}>
    <div className="sticky-buy-info"><strong>{bn && product.bn ? product.bn.name : product.name}</strong><PriceTag price={product.price} compareAt={product.compareAt} locale={locale} /></div>
    <button type="button" className="button brand-button" disabled={soldOut} tabIndex={show ? undefined : -1}
      onClick={() => (document.querySelector(".add-to-bag") as HTMLButtonElement | null)?.click()}>
      <ShoppingBag size={16} />{soldOut ? (bn ? "স্টক শেষ" : "Out of stock") : bn ? "ব্যাগে যোগ করুন" : "Add to bag"}</button>
  </div>;
}

const CLOTHING = [["S", "92–97", "66"], ["M", "98–103", "69"], ["L", "104–109", "72"], ["XL", "110–116", "75"], ["XXL", "117–123", "78"]];
/** General size chart for clothing and caps (shown only where sizes matter). Exact measurements stay in each product's details. */
export function SizeGuide({ product }: { product: Product }) {
  const enabled = useFeature("sizeGuide");
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const cap = product.collectionId === "caps" || /cap|beanie|hat/i.test(product.category);
  const clothing = !cap && product.sizes.some(s => /^(XS|S|M|L|XL|XXL)$/i.test(s));
  if (!enabled || (!cap && !clothing)) return null;
  return <details className="size-guide">
    <summary>{t("Size guide", "সাইজ গাইড")}</summary>
    {clothing ? <>
      <table><thead><tr><th>{t("Size", "সাইজ")}</th><th>{t("Chest (cm)", "বুক (সেমি)")}</th><th>{t("Length (cm)", "লম্বা (সেমি)")}</th></tr></thead>
        <tbody>{CLOTHING.map(([s, chest, len]) => <tr key={s} className={product.sizes.includes(s) ? "" : "is-na"}><td>{s}</td><td>{n(chest, bn)}</td><td>{n(len, bn)}</td></tr>)}</tbody></table>
      <p>{t("How to measure: chest — around the fullest part, under the arms; length — from the top of the shoulder to the hem. Between two sizes? Choose the larger one for a relaxed fit.", "কীভাবে মাপবেন: বুক — বাহুর নিচে সবচেয়ে চওড়া জায়গায় চারপাশে; লম্বা — কাঁধের ওপর থেকে নিচের প্রান্ত পর্যন্ত। দুই সাইজের মাঝে হলে আরাম করে পরতে বড়টি নিন।")}</p>
    </> : <p>{t("Caps and beanies fit head sizes of about 54–60 cm. Measure around your head, just above the ears and eyebrows. Adjustable straps fit most adults.", "ক্যাপ ও বিনি প্রায় ৫৪–৬০ সেমি মাথায় মানায়। কান ও ভ্রুর একটু ওপর দিয়ে মাথার চারপাশ মাপুন। অ্যাডজাস্টেবল স্ট্র্যাপ বেশিরভাগ বড়দের মাথায় হয়।")}</p>}
    <p className="small-note">{t("General guide. If a product lists its own measurements, those come first.", "সাধারণ গাইড। পণ্যের নিজস্ব মাপ দেওয়া থাকলে সেটাই আগে দেখুন।")}</p>
  </details>;
}
const n = (s: string, bn: boolean) => bn ? bnDigits(s) : s;

/** "Complete the look": up to two matching items from other sections, added together in one tap (first size/colour; changeable in the bag). */
export function CompleteLook({ product, others, onAdd }: { product: Product; others: Product[]; onAdd: (items: Product[]) => void }) {
  const enabled = useFeature("completeLook");
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const wearable = (p: Product) => p.collectionId === "seasonal" || p.collectionId === "caps";
  if (!enabled || !wearable(product)) return null;
  const picks = others.filter(p => wearable(p) && p.collectionId !== product.collectionId && p.inStock !== false).slice(0, 2);
  if (!picks.length) return null;
  const total = product.price + picks.reduce((s, p) => s + p.price, 0);
  return <section className="complete-look" aria-labelledby="look-title">
    <h2 id="look-title">{t("Complete the look", "পুরো লুকটি নিন")}</h2>
    <div className="look-row">
      {[product, ...picks].map(p => <Link key={p.slug} href={`/products/${p.slug}`} className="look-item"><span className="look-photo"><ProductPhoto position={p.position} image={p.image} label={bn && p.bn ? p.bn.name : p.name} /></span><small>{bn && p.bn ? p.bn.name : p.name}</small><b>{formatPrice(p.price, locale)}</b></Link>)}
    </div>
    <div className="look-foot"><span>{t("Together", "একসাথে")} <b>{formatPrice(total, locale)}</b></span>
      <button type="button" className="button brand-button" onClick={() => onAdd(picks)}>{t(`Add ${picks.length === 1 ? "it" : "both"} to bag`, `${picks.length === 1 ? "এটিও" : "দুটোই"} ব্যাগে যোগ করুন`)}</button></div>
  </section>;
}
