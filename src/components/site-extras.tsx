"use client";

import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { useT } from "./locale";

/** Floating WhatsApp (only when a number is set) and back-to-top buttons.
 * Back-to-top appears only after scrolling, so it never covers the first screen. */
export function FloatingHelp({ whatsappUrl }: { whatsappUrl: string }) {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 600);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  return <div className="floating-help">
    <a href="#top" className={`float-btn float-top${scrolled ? " is-shown" : ""}`} aria-label={t("Back to top", "উপরে যান")} tabIndex={scrolled ? undefined : -1}><ArrowUp size={20} /></a>
    {whatsappUrl && <a href={whatsappUrl} className="float-btn float-wa" target="_blank" rel="noopener noreferrer" aria-label={t("Chat on WhatsApp", "WhatsApp-এ কথা বলুন")}><MessageCircle size={22} /></a>}
  </div>;
}

/** Desktop-only soft cursor ring that follows the pointer and grows over links and buttons.
 * The normal cursor stays; skipped on touch screens and when motion is reduced or paused. */
export function CustomCursor() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const ring = document.createElement("div"); ring.className = "cursor-ring"; ring.setAttribute("aria-hidden", "true"); document.body.appendChild(ring);
    let x = -100, y = -100, rx = x, ry = y, frame = 0;
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; const t = e.target as Element | null;
      ring.classList.toggle("is-hover", Boolean(t?.closest("a, button, [role=button], [role=tab], summary, label")));
      ring.classList.toggle("is-off", Boolean(t?.closest("[data-motion=paused], input, textarea, select, dialog"))); };
    const tick = () => { rx += (x - rx) * 0.2; ry += (y - ry) * 0.2; ring.style.transform = `translate(${rx}px, ${ry}px)`; frame = requestAnimationFrame(tick); };
    window.addEventListener("pointermove", move, { passive: true }); frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); ring.remove(); };
  }, []);
  return null;
}
