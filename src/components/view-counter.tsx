"use client";
import { useEffect } from "react";
/** Adds one anonymous view for this product (once per browser tab session). Nothing personal is sent. */
export function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `oanro-viewed:${slug}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* storage blocked: still count */ }
    fetch("/api/track/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }), keepalive: true, credentials: "omit" }).catch(() => {});
  }, [slug]);
  return null;
}
