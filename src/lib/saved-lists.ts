"use client";

// Wishlist and compare lists, kept in the browser like the bag (see cart.ts). Both hold product slugs
// only; prices, stock and visibility always come from the live catalog. Signed-in shoppers also keep
// their wishlist on the server (/api/account/wishlist); the browser copy is merged into it on sign-in.

import { useSyncExternalStore } from "react";

const slugOk = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9-]{1,60}$/.test(s);

/** A small localStorage-backed list of unique slugs with a size limit. */
function slugList(key: string, event: string, limit: number) {
  const empty: string[] = [];
  let snapshot = empty;
  let rawCache: string | null | undefined;
  function read() {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return snapshot;
    }
    if (raw === rawCache) return snapshot;
    rawCache = raw;
    try {
      const data: unknown = JSON.parse(raw || "[]");
      snapshot = Array.isArray(data) ? [...new Set(data.filter(slugOk))].slice(0, limit) : empty;
    } catch {
      snapshot = empty;
    }
    return snapshot;
  }
  function write(items: string[]) {
    snapshot = items;
    try {
      const raw = JSON.stringify(items);
      localStorage.setItem(key, raw);
      rawCache = raw;
    } catch {}
    window.dispatchEvent(new Event(event));
  }
  function listen(fn: () => void) {
    window.addEventListener("storage", fn);
    window.addEventListener(event, fn);
    return () => {
      window.removeEventListener("storage", fn);
      window.removeEventListener(event, fn);
    };
  }
  return {
    read,
    write,
    use: () => useSyncExternalStore(listen, read, () => empty),
    /** Adds or removes a slug. Returns false when the list is full and nothing was added. */
    toggle(slug: string) {
      const current = read();
      if (current.includes(slug)) {
        write(current.filter(s => s !== slug));
        return true;
      }
      if (current.length >= limit) return false;
      write([...current, slug]);
      return true;
    },
    remove: (slug: string) => write(read().filter(s => s !== slug)),
    clear: () => write([]),
  };
}

// Wishlist: up to 100 products. Changes are also sent to the server for signed-in shoppers.

const wishlist = slugList("oanro-wishlist-v1", "oanro-wishlist", 100);
export const useWishlist = wishlist.use;
export const readWishlist = wishlist.read;

/** Replaces the browser copy, for example with the server list after sign-in. */
export function setWishlist(slugs: string[]) {
  wishlist.write([...new Set(slugs.filter(slugOk))].slice(0, 100));
}

export function toggleWishlist(slug: string) {
  const saved = !wishlist.read().includes(slug);
  wishlist.toggle(slug);
  // The server ignores signed-out visitors (401), so this is safe to send for everyone.
  fetch("/api/account/wishlist", {
    method: saved ? "POST" : "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug }),
    keepalive: true,
  }).catch(() => {});
  return saved;
}

// Compare: up to 3 products, browser only.

export const COMPARE_LIMIT = 3;
const compare = slugList("oanro-compare-v1", "oanro-compare", COMPARE_LIMIT);
export const useCompare = compare.use;
export const toggleCompare = compare.toggle;
export const removeFromCompare = compare.remove;
export const clearCompare = compare.clear;

let synced = false;
/**
 * Once per page load: for signed-in shoppers, merge the browser wishlist into the server copy and use the
 * merged list from then on. Signed-out visitors get a 401 and keep their browser list unchanged.
 */
export async function syncWishlistOnce() {
  if (synced || typeof window === "undefined") return;
  synced = true;
  try {
    const local = wishlist.read();
    const res = local.length
      ? await fetch("/api/account/wishlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slugs: local }),
        })
      : await fetch("/api/account/wishlist");
    if (!res.ok) return;
    const data = (await res.json()) as { slugs?: unknown };
    if (Array.isArray(data.slugs)) setWishlist(data.slugs.filter(slugOk));
  } catch {}
}
