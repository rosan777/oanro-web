"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { useT } from "./locale";

/** Floating WhatsApp (only when a number is set) and back-to-top buttons.
 * Back-to-top appears only after scrolling, so it never covers the first screen; the owner can switch it off in Admin > Products & sections.
 * Layout: back-to-top bottom left, WhatsApp bottom right (the assistant sits above it). */
export function FloatingHelp({
  whatsappUrl,
  backToTop = true,
}: {
  whatsappUrl: string;
  backToTop?: boolean;
}) {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 600);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  if (!backToTop && !whatsappUrl) return null;
  return (
    <div className="floating-help">
      {backToTop && (
        <a
          href="#top"
          className={`float-btn float-top${scrolled ? " is-shown" : ""}`}
          aria-label={t("Back to top", "উপরে যান")}
          tabIndex={scrolled ? undefined : -1}
        >
          <ArrowUp size={14} />
        </a>
      )}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          className="float-btn float-wa"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("Chat on WhatsApp", "WhatsApp-এ কথা বলুন")}
        >
          <MessageCircle size={22} />
        </a>
      )}
    </div>
  );
}

/** Desktop-only soft cursor ring that follows the pointer and grows over links and buttons.
 * The normal cursor stays; skipped on touch screens and when motion is reduced or paused. */
export function CustomCursor() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches)
      return;
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    // Pointer position, and the ring's eased position that follows it (20% closer every frame).

    let x = -100,
      y = -100,
      rx = x,
      ry = y,
      frame = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as Element | null;
      ring.classList.toggle(
        "is-hover",
        Boolean(t?.closest("a, button, [role=button], [role=tab], summary, label")),
      );
      ring.classList.toggle(
        "is-off",
        Boolean(t?.closest("[data-motion=paused], input, textarea, select, dialog")),
      );
    };
    const tick = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      ring.remove();
    };
  }, []);
  return null;
}

/** Footer newsletter sign-up with explicit consent; a welcome email follows. */
export function NewsletterSignup() {
  const t = useT();
  const [state, setState] = useState<
    "idle" | "busy" | "subscribed" | "already" | "invalid" | "limited" | "down"
  >("idle");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("busy");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: f.get("email"),
        consent: f.get("consent") === "on",
        website: f.get("website"),
        locale: document.documentElement.lang === "bn" ? "bn" : "en",
      }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { result?: string };
    // Success is shown only after the server saved the sign-up. Otherwise say what went wrong.
    setState(
      res?.ok
        ? data.result === "already"
          ? "already"
          : "subscribed"
        : res?.status === 429
          ? "limited"
          : !res || res.status >= 500
            ? "down"
            : "invalid",
    );
  }
  if (state === "subscribed" || state === "already")
    return (
      <p className="o-news-done" role="status">
        {state === "already"
          ? t("You're already on the list. Thank you!", "আপনি আগেই তালিকায় আছেন। ধন্যবাদ!")
          : t(
              "You're on the list. Check your inbox for a welcome email.",
              "আপনি তালিকায় যুক্ত হয়েছেন। স্বাগত ইমেইলের জন্য ইনবক্স দেখুন।",
            )}
      </p>
    );
  return (
    <form className="o-news" onSubmit={submit} noValidate={false}>
      <div className="o-news-row">
        <label className="o-sr" htmlFor="news-email">
          {t("Email address for offers", "অফারের জন্য ইমেইল ঠিকানা")}
        </label>
        <input
          id="news-email"
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder={t("Your email", "আপনার ইমেইল")}
          autoComplete="email"
          aria-describedby="news-status"
        />
        <button disabled={state === "busy"} aria-busy={state === "busy"}>
          {state === "busy" ? t("Joining…", "যুক্ত হচ্ছে…") : t("Join", "যুক্ত হোন")}
        </button>
      </div>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="inquiry-trap"
        aria-hidden="true"
      />
      <label className="o-news-consent">
        <input type="checkbox" name="consent" required />
        <span>
          {t("Email me offers. Unsubscribe anytime.", "ইমেইলে অফার চাই। যেকোনো সময় বন্ধ করুন।")}
        </span>
      </label>
      <p id="news-status" className="o-news-status" role="status" aria-live="polite">
        {state === "invalid"
          ? t(
              "Check your email address and tick the box, then try again.",
              "ইমেইল ঠিকানা দেখুন ও বক্সে টিক দিন, তারপর আবার চেষ্টা করুন।",
            )
          : state === "limited"
            ? t(
                "Too many sign-up attempts from this device. Please try again in an hour.",
                "এই ডিভাইস থেকে অনেকবার চেষ্টা হয়েছে। এক ঘণ্টা পরে আবার চেষ্টা করুন।",
              )
            : state === "down"
              ? t(
                  "Couldn't sign you up right now. Please try again.",
                  "এই মুহূর্তে যুক্ত করা যায়নি। আবার চেষ্টা করুন।",
                )
              : ""}
      </p>
    </form>
  );
}
