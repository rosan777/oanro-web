"use client";
import { useEffect } from "react";
import { allows, rememberProduct } from "@/lib/consent";
/** Product page visit. Anonymous view count only if the visitor allowed Analytics; remembered for recommendations only if they allowed Personalisation. */
export function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    rememberProduct(slug);
    if (!allows("analytics")) return;
    const key = `oanro-viewed:${slug}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* storage blocked: still count */ }
    fetch("/api/track/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }), keepalive: true, credentials: "omit" }).catch(() => {});
  }, [slug]);
  return null;
}
