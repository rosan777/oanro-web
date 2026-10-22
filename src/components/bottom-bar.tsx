"use client";

import { usePathname } from "next/navigation";
import { House, LayoutGrid, Search, ShoppingBag, User } from "lucide-react";
import Link from "./locale-link";
import { useLocale } from "./locale";
import { useCart } from "@/lib/cart";

/** Phones only (CSS): Home, Shop, Search, Bag, Account — always one thumb-tap away. Hidden in admin and checkout. */
export function BottomBar({ shop }: { shop: boolean }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const path = (usePathname() ?? "/").replace(/^\/bn(?=\/|$)/, "") || "/";
  const count = useCart().reduce((sum, item) => sum + item.quantity, 0);
  if (/^\/(admin|checkout|sign-in|reset-password)/.test(path)) return null;
  const at = (p: string) => p === "/" ? path === "/" : path.startsWith(p);
  return <nav className="bottom-bar" aria-label={t("Quick menu", "দ্রুত মেনু")}>
    <Link href="/" aria-current={at("/") ? "page" : undefined}><House size={22} aria-hidden="true" /><span>{t("Home", "হোম")}</span></Link>
    {shop && <Link href="/#products"><LayoutGrid size={22} aria-hidden="true" /><span>{t("Shop", "শপ")}</span></Link>}
    <button type="button" onClick={() => window.dispatchEvent(new Event("oanro-open-search"))}><Search size={22} aria-hidden="true" /><span>{t("Search", "খুঁজুন")}</span></button>
    {shop && <button type="button" onClick={() => window.dispatchEvent(new Event("oanro-open-bag"))} aria-label={t(`Bag, ${count} items`, `ব্যাগ, ${count}টি পণ্য`)}>
      <span className="bb-icon"><ShoppingBag size={22} aria-hidden="true" />{count > 0 && <b className="bb-count">{count > 99 ? "99+" : count}</b>}</span><span>{t("Bag", "ব্যাগ")}</span></button>}
    <Link href="/account" aria-current={at("/account") ? "page" : undefined}><User size={22} aria-hidden="true" /><span>{t("Account", "অ্যাকাউন্ট")}</span></Link>
  </nav>;
}
