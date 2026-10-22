"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CONSENT_EVENT, allows } from "@/lib/consent";

/** Loads the Meta Pixel only after the visitor allows Analytics in Privacy settings, and counts each page view. */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  const [ok, setOk] = useState(false);
  const path = usePathname();
  useEffect(() => {
    const sync = () => setOk(allows("analytics"));
    sync(); window.addEventListener(CONSENT_EVENT, sync); return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);
  useEffect(() => {
    if (!ok || !/^\d{6,20}$/.test(pixelId) || path?.startsWith("/admin")) return;
    const w = window as unknown as { fbq?: ((...a: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...a: unknown[]) => void; loaded?: boolean; version?: string; push?: unknown } ; _fbq?: unknown };
    if (!w.fbq) {
      // Meta's standard loader, written out so nothing runs before consent.
      const q: unknown[] = [];
      const f = Object.assign((...args: unknown[]) => { if (f.callMethod) f.callMethod(...args); else q.push(args); }, { queue: q, loaded: true, version: "2.0", push: undefined as unknown, callMethod: undefined as ((...a: unknown[]) => void) | undefined });
      f.push = f; w.fbq = f; w._fbq = f;
      const s = document.createElement("script"); s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(s);
      w.fbq("init", pixelId);
    }
    w.fbq("track", "PageView");
  }, [ok, pixelId, path]);
  return null;
}
