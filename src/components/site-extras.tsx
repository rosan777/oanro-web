"use client";

import { useEffect, useState, type FormEvent } from "react";
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
    <a href="#top" className={`float-btn float-top${scrolled ? " is-shown" : ""}`} aria-label={t("Back to top", "উপরে যান")} tabIndex={scrolled ? undefined : -1}><ArrowUp size={16} /></a>
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

/** Footer newsletter sign-up with explicit consent; a welcome email follows. */
export function NewsletterSignup() {
  const t = useT();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setState("busy");
    const res = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), consent: f.get("consent") === "on", website: f.get("website"), locale: document.documentElement.lang === "bn" ? "bn" : "en" }) }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }
  if (state === "done") return <p className="news-done" role="status">{t("You're on the list — check your inbox for a welcome email.", "আপনি তালিকায় আছেন — স্বাগত ইমেইলের জন্য ইনবক্স দেখুন।")}</p>;
  return <form className="news-form" onSubmit={submit}>
    <label htmlFor="news-email">{t("Get new drops and offers first", "নতুন কালেকশন আর অফার সবার আগে পান")}</label>
    <div className="news-row"><input id="news-email" name="email" type="email" required placeholder={t("Your email", "আপনার ইমেইল")} autoComplete="email" />
      <button className="button brand-button" disabled={state === "busy"} aria-busy={state === "busy"}>{t("Sign up", "যোগ দিন")}</button></div>
    <input name="website" tabIndex={-1} autoComplete="off" className="inquiry-trap" aria-hidden="true" />
    <label className="news-consent"><input type="checkbox" name="consent" required />{t("I agree to receive OANRO emails. Unsubscribe any time.", "OANRO-র ইমেইল পেতে রাজি। যেকোনো সময় বন্ধ করা যাবে।")}</label>
    {state === "error" && <p className="news-error" role="alert">{t("Couldn't sign you up. Check the email and try again.", "যোগ করা যায়নি। ইমেইল দেখে আবার চেষ্টা করুন।")}</p>}
  </form>;
}
