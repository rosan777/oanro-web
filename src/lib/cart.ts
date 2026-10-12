"use client";
import { useSyncExternalStore } from "react";
import { products } from "./catalog";
export type CartItem = { slug: string; size: string; quantity: number };
const empty: CartItem[] = [];
let snapshot: CartItem[] = empty;
let rawCache: string | null | undefined;
const key = "oanro-demo-cart-v2";
function read() {
  let raw: string | null;
  try { raw = localStorage.getItem(key); } catch { return snapshot; }
  if (raw === rawCache) return snapshot;
  rawCache = raw;
  try {
    const data: unknown = JSON.parse(raw || "[]");
    snapshot = Array.isArray(data) ? data.filter((item): item is CartItem => Boolean(item && typeof item === "object" && products.some(p => p.slug === item.slug && p.sizes.includes(item.size)) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10)) : empty;
  } catch { snapshot = empty; }
  return snapshot;
}
function listen(fn: () => void) { window.addEventListener("storage", fn); window.addEventListener("oanro-cart", fn); return () => { window.removeEventListener("storage", fn); window.removeEventListener("oanro-cart", fn); }; }
export function useCart() { return useSyncExternalStore(listen, read, () => empty); }
function write(items: CartItem[]) { snapshot = items; try { const raw = JSON.stringify(items); localStorage.setItem(key, raw); rawCache = raw; } catch {} window.dispatchEvent(new Event("oanro-cart")); }
export function addToCart(slug: string, size: string) { const current = read(); const match = current.find(x => x.slug === slug && x.size === size); write(match ? current.map(x => x === match ? { ...x, quantity: Math.min(10, x.quantity + 1) } : x) : [...current, { slug, size, quantity: 1 }]); }
export function changeQuantity(slug: string, size: string, delta: number) { write(read().map(x => x.slug === slug && x.size === size ? { ...x, quantity: Math.min(10, x.quantity + delta) } : x).filter(x => x.quantity > 0)); }
export function removeItem(slug: string, size: string) { write(read().filter(x => x.slug !== slug || x.size !== size)); }
