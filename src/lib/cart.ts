"use client";

// The shopping bag, kept in the browser's localStorage. Components read it with useCart(), which
// re-renders on changes from this tab (the "oanro-cart" event) and from other tabs ("storage").

import { allows } from "./consent";
import { useSyncExternalStore } from "react";
/** color is the colour id ("" for products without colours). */
export type CartItem = { slug: string; size: string; color: string; quantity: number };

// Last parsed bag and the raw text it came from, so read() only re-parses when storage changed
// (useSyncExternalStore needs the same array back while nothing changed).

const empty: CartItem[] = [];
let snapshot: CartItem[] = empty;
let rawCache: string | null | undefined;
const key = "oanro-demo-cart-v2";
const same = (x: CartItem, slug: string, size: string, color: string) =>
  x.slug === slug && x.size === size && x.color === color;
function read() {
  let raw: string | null;
  try {
    // Storage blocked (private mode, disabled cookies): keep showing the last known bag.

    raw = localStorage.getItem(key);
  } catch {
    return snapshot;
  }
  if (raw === rawCache) return snapshot;
  rawCache = raw;
  try {
    const data: unknown = JSON.parse(raw || "[]");

    // Keep only well-formed lines; anything edited by hand or left by an older version is dropped.
    // Lines saved before colours existed get an empty colour.

    snapshot = Array.isArray(data)
      ? data
          .filter((item): item is CartItem =>
            Boolean(
              item &&
              typeof item === "object" &&
              typeof item.slug === "string" &&
              /^[a-z0-9-]{1,60}$/.test(item.slug) &&
              typeof item.size === "string" &&
              item.size.length <= 20 &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              item.quantity <= 10 &&
              (item.color === undefined ||
                (typeof item.color === "string" && /^[a-z0-9-]{0,30}$/.test(item.color))),
            ),
          )
          .map(item => ({ ...item, color: item.color ?? "" }))
      : empty;
  } catch {
    snapshot = empty;
  }
  return snapshot;
}
function listen(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener("oanro-cart", fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener("oanro-cart", fn);
  };
}
export function useCart() {
  return useSyncExternalStore(listen, read, () => empty);
}
// Signed-in shoppers who allowed Functional cookies: the bag is also kept on the server (for one reminder email).
// The server ignores signed-out visitors. Debounced so quick changes send one request.
let syncTimer: ReturnType<typeof setTimeout> | undefined;
function syncBag(items: CartItem[]) {
  if (typeof window === "undefined" || !allows("functional")) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch("/api/account/bag", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
      keepalive: true,
    }).catch(() => {});
  }, 1500);
}

// Saves the bag, tells the server (when allowed) and notifies every useCart() in this tab.

function write(items: CartItem[]) {
  snapshot = items;
  syncBag(items);
  try {
    const raw = JSON.stringify(items);
    localStorage.setItem(key, raw);
    rawCache = raw;
  } catch {}
  window.dispatchEvent(new Event("oanro-cart"));
}

// Bag actions. A line is one product + size + colour; quantities stay between 1 and 10.

export function addToCart(slug: string, size: string, color = "") {
  const current = read();
  const match = current.find(x => same(x, slug, size, color));
  write(
    match
      ? current.map(x => (x === match ? { ...x, quantity: Math.min(10, x.quantity + 1) } : x))
      : [...current, { slug, size, color, quantity: 1 }],
  );
}
export function changeQuantity(slug: string, size: string, delta: number, color = "") {
  write(
    read()
      .map(x =>
        same(x, slug, size, color) ? { ...x, quantity: Math.min(10, x.quantity + delta) } : x,
      )
      .filter(x => x.quantity > 0),
  );
}
export function removeItem(slug: string, size: string, color = "") {
  write(read().filter(x => !same(x, slug, size, color)));
}
export function clearCart() {
  write([]);
}
