"use client";

// Compact live search in the header: the icon expands into an input (a row under the header on narrow
// screens) with a tray of up to five real results from /api/search. Keyboard: arrows move, Enter opens
// the highlighted result or all results, Escape closes and returns focus to the icon.
// Search insights (counting rules in lib/search-insights.ts) are sent only with Analytics consent.

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import Link from "./locale-link";
import { useLocale } from "./locale";
import { PriceTag, ProductPhoto } from "./shell";
import { allows } from "@/lib/consent";
import { localePath } from "@/lib/locale-path";

type Hit = {
  type: "product" | "collection" | "service";
  slug: string;
  title: string;
  detail: string;
  href: string;
  image: string | null;
  position?: string;
  price?: number;
  compareAt?: number | null;
  inStock?: boolean;
};
type Status = "idle" | "loading" | "ready" | "error";

/** Sends one search-insights event when the visitor allowed Analytics. Never throws, never blocks. */
function track(event: Record<string, unknown>) {
  try {
    if (!allows("analytics")) return;
    void fetch("/api/search/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function HeaderSearch({ onOpen }: { onOpen?: () => void }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const router = useRouter();
  const id = useId();
  const listId = `${id}-results`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const composing = useRef(false);
  const requestNo = useRef(0);
  const interaction = useRef("");
  const counted = useRef(new Set<string>());

  const openSearch = useCallback(() => {
    interaction.current = crypto.randomUUID();
    counted.current = new Set();
    setOpen(true);
    onOpen?.();
    requestAnimationFrame(() => input.current?.focus());
  }, [onOpen]);
  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    setActive(-1);
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  // The phone bottom bar opens search with this event.
  useEffect(() => {
    const handler = () => openSearch();
    window.addEventListener("oanro-open-search", handler);
    return () => window.removeEventListener("oanro-open-search", handler);
  }, [openSearch]);

  // Outside click closes the tray (focus stays where the visitor clicked).
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open, close]);

  const run = useCallback(
    async (q: string) => {
      const mine = ++requestNo.current;
      if (q.trim().length < 2) {
        setHits([]);
        setTotal(0);
        setStatus("idle");
        return;
      }
      setStatus("loading");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&locale=${locale}`);
        if (mine !== requestNo.current) return; // a newer search started: ignore this stale answer
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { hits: Hit[]; total: number };
        if (mine !== requestNo.current) return;
        setHits(data.hits);
        setTotal(data.total);
        setActive(-1);
        setStatus("ready");
      } catch {
        if (mine === requestNo.current) setStatus("error");
      }
    },
    [locale],
  );

  // Debounce: search 300 ms after typing stops (not while a Bangla/IME word is still being composed).
  useEffect(() => {
    if (!open || composing.current) return;
    const timer = setTimeout(() => void run(query), 300);
    return () => clearTimeout(timer);
  }, [query, open, run]);

  // Count a settled search: results shown and no typing for about a second, once per query.
  useEffect(() => {
    if (status !== "ready" || query.trim().length < 2) return;
    const q = query.trim();
    const timer = setTimeout(() => {
      const key = `search|${q.toLowerCase()}`;
      if (counted.current.has(key)) return;
      counted.current.add(key);
      track({
        interactionId: interaction.current,
        kind: "search",
        query: q,
        locale,
        resultCount: total,
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [status, query, total, locale]);

  function go(hit: Hit, index: number) {
    const q = query.trim();
    const key = `select|${q.toLowerCase()}`;
    if (!counted.current.has(key)) {
      counted.current.add(key);
      track({
        interactionId: interaction.current,
        kind: "select",
        query: q,
        locale,
        resultCount: total,
        selectedType: hit.type,
        selectedSlug: hit.slug,
        position: index + 1,
      });
    }
    close(false);
    setQuery("");
    router.push(localePath(hit.href, locale));
  }
  function showAll() {
    const q = query.trim();
    if (q.length < 2) return;
    const key = `submit|${q.toLowerCase()}`;
    if (!counted.current.has(key)) {
      counted.current.add(key);
      track({
        interactionId: interaction.current,
        kind: "submit",
        query: q,
        locale,
        resultCount: total,
      });
    }
    close(false);
    router.push(localePath(`/search?q=${encodeURIComponent(q)}`, locale));
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    const count = hits.length + (query.trim().length >= 2 ? 1 : 0); // results + "View all"
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => (count ? (a + 1) % count : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => (count ? (a <= 0 ? count - 1 : a - 1) : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < hits.length) go(hits[active], active);
      else showAll();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else close();
    }
  }

  const typeLabel = (h: Hit) =>
    h.type === "product"
      ? h.inStock === false
        ? t("Product · out of stock", "পণ্য · স্টক শেষ")
        : t(`Product · ${h.detail}`, `পণ্য · ${h.detail}`)
      : h.type === "collection"
        ? t(`Collection · ${h.detail} products`, `কালেকশন · ${h.detail}টি পণ্য`)
        : t("Studio service", "স্টুডিও সেবা");
  const expanded = open && query.trim().length >= 2;
  const optionId = (i: number) => `${id}-opt-${i}`;
  return (
    <div className={`o-search-bar${open ? " is-open" : ""}`} ref={box}>
      {!open && (
        <button
          ref={trigger}
          type="button"
          className="o-search-trigger"
          title={t("Search", "খুঁজুন")}
          aria-label={t("Search OANRO", "OANRO-তে খুঁজুন")}
          onClick={openSearch}
        >
          <Search size={20} />
        </button>
      )}
      {open && (
        <div className="o-search-field" role="search">
          <Search size={18} aria-hidden="true" />
          <label className="o-sr" htmlFor={`${id}-input`}>
            {t("Search products, collections and services", "পণ্য, কালেকশন ও সেবা খুঁজুন")}
          </label>
          <input
            ref={input}
            id={`${id}-input`}
            type="search"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            enterKeyHint="search"
            maxLength={80}
            placeholder={t("Search products or services", "পণ্য বা সেবা খুঁজুন")}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={e => {
              composing.current = false;
              setQuery(e.currentTarget.value);
            }}
          />
          {status === "loading" && <Loader2 size={16} className="o-spin" aria-hidden="true" />}
          <button
            type="button"
            className="o-search-close"
            aria-label={
              query ? t("Clear search", "খোঁজা মুছুন") : t("Close search", "খোঁজা বন্ধ করুন")
            }
            onClick={() => {
              if (query) {
                setQuery("");
                input.current?.focus();
              } else close();
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {expanded && (
        <div className="o-search-tray">
          <ul id={listId} role="listbox" aria-label={t("Search results", "খোঁজার ফলাফল")}>
            {hits.map((h, i) => (
              <li
                key={`${h.type}-${h.slug}`}
                id={optionId(i)}
                role="option"
                aria-selected={active === i}
                className={active === i ? "is-active" : ""}
                onPointerEnter={() => setActive(i)}
                onClick={() => go(h, i)}
              >
                <span className="o-search-thumb" aria-hidden="true">
                  {h.type === "service" ? (
                    <b>{h.detail.slice(0, 2)}</b>
                  ) : (
                    <ProductPhoto position={h.position ?? "0 0"} image={h.image} label="" />
                  )}
                </span>
                <span className="o-search-text">
                  <b>{h.title}</b>
                  <small>{typeLabel(h)}</small>
                </span>
                {h.type === "product" && h.price !== undefined && (
                  <PriceTag price={h.price} compareAt={h.compareAt} locale={locale} />
                )}
              </li>
            ))}
            <li
              id={optionId(hits.length)}
              role="option"
              aria-selected={active === hits.length}
              className={`o-search-all${active === hits.length ? " is-active" : ""}`}
              onPointerEnter={() => setActive(hits.length)}
              onClick={showAll}
            >
              {total > hits.length
                ? t(`View all ${total} results`, `সব ${total}টি ফলাফল দেখুন`)
                : t("View all results", "সব ফলাফল দেখুন")}
            </li>
          </ul>
          <p className="o-search-status" role="status" aria-live="polite">
            {status === "loading"
              ? t("Searching…", "খোঁজা হচ্ছে…")
              : status === "error"
                ? ""
                : status === "ready" && !hits.length
                  ? t(`Nothing found for “${query.trim()}”.`, `“${query.trim()}” পাওয়া যায়নি।`)
                  : status === "ready"
                    ? t(`${total} results`, `${total}টি ফলাফল`)
                    : ""}
          </p>
          {status === "error" && (
            <p className="o-search-error" role="alert">
              {t("Search is not responding.", "খোঁজা কাজ করছে না।")}{" "}
              <button type="button" onClick={() => void run(query)}>
                {t("Try again", "আবার চেষ্টা করুন")}
              </button>
            </p>
          )}
          {status === "ready" && !hits.length && (
            <p className="o-search-help">
              {t(
                "Tell us what you need and we will try to find it.",
                "কী খুঁজছেন জানান, আমরা খুঁজে দেওয়ার চেষ্টা করব।",
              )}{" "}
              <Link href="/contact" onClick={() => close(false)}>
                {t("Ask us", "জিজ্ঞাসা করুন")}
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
