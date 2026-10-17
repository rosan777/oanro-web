"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useLocale } from "./locale";

type Kind = "product" | "restock" | "service" | "general" | "privacy";
const L = (bn: boolean, en: string, b: string) => bn ? b : en;
/** Customer inquiry form. Saves to the owner's inbox; nothing is sent to third parties. */
export function InquiryForm({ kind, productSlug, productName, size, services = [] }: { kind: Kind; productSlug?: string; productName?: string; size?: string; services?: { slug: string; title: string }[] }) {
  const { locale } = useLocale(); const bn = locale === "bn";
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const fieldText: Record<string, [string, string]> = {
    phone: ["Enter a phone number we can reach (or an email).", "যোগাযোগের জন্য একটি ফোন নম্বর (অথবা ইমেইল) দিন।"], email: ["Check the email address.", "ইমেইল ঠিকানাটি দেখে নিন।"],
    name: ["Please enter your name.", "আপনার নাম লিখুন।"], message: ["Please write a short message.", "একটি ছোট বার্তা লিখুন।"], consent: ["Please agree to the privacy notice.", "প্রাইভেসি নোটিশে সম্মতি দিন।"],
    quantity: ["Quantity must be between 1 and 100.", "পরিমাণ ১ থেকে ১০০-এর মধ্যে হতে হবে।"], requestType: ["Choose what you'd like us to do.", "আপনি কী চান তা বেছে নিন।"],
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setState("sending");
    const form = new FormData(event.currentTarget);
    const body = { ...Object.fromEntries(form.entries()), kind: kind === "general" && form.get("serviceSlug") ? "service" : kind, productSlug, size: size ?? form.get("size") ?? "", consent: form.get("consent") === "on", locale };
    try {
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { error?: string; field?: string };
      if (response.ok) { setState("sent"); return; }
      setError(result.error === "RATE_LIMITED" ? L(bn, "Too many messages from this connection. Please try again in an hour, or message us on Messenger.", "এই সংযোগ থেকে অনেক বার্তা এসেছে। এক ঘণ্টা পর আবার চেষ্টা করুন, অথবা মেসেঞ্জারে লিখুন।")
        : result.field && fieldText[result.field] ? fieldText[result.field][bn ? 1 : 0] : L(bn, "Couldn't send. Please try again.", "পাঠানো যায়নি। আবার চেষ্টা করুন।"));
    } catch { setError(L(bn, "Couldn't reach the server. Please try again.", "সার্ভারে পৌঁছানো যায়নি। আবার চেষ্টা করুন।")); }
    setState("idle");
  }
  if (state === "sent") return <div className="inquiry-done" role="status"><strong>{L(bn, "Thank you! We've received your message.", "ধন্যবাদ! আপনার বার্তা আমরা পেয়েছি।")}</strong><p>{kind === "restock" ? L(bn, "We'll contact you when it's back in stock.", "পণ্যটি আবার এলে আমরা আপনাকে জানাব।") : kind === "privacy" ? L(bn, "We'll confirm your identity and reply within 30 days.", "পরিচয় নিশ্চিত করে ৩০ দিনের মধ্যে আমরা উত্তর দেব।") : L(bn, "We usually reply within one working day.", "সাধারণত এক কর্মদিবসের মধ্যে উত্তর দিই।")}</p></div>;
  const title = kind === "restock" ? L(bn, "Notify me when it's back", "আবার এলে আমাকে জানান") : kind === "privacy" ? L(bn, "Privacy request", "প্রাইভেসি অনুরোধ") : kind === "product" ? L(bn, "Send an inquiry", "জিজ্ঞাসা পাঠান") : L(bn, "Send us a message", "আমাদের বার্তা পাঠান");
  return <form className="inquiry-form" onSubmit={submit} noValidate={false}>
    <h3>{title}</h3>
    {productName && <p className="inquiry-about">{productName}{size ? ` · ${size}` : ""}</p>}
    {/* Honeypot: hidden from people, bots tend to fill it in. */}
    <input type="text" name="website" tabIndex={-1} autoComplete="off" className="inquiry-trap" aria-hidden="true" />
    {kind === "privacy" && <label>{L(bn, "What would you like us to do?", "আপনি কী চান?")}<select name="requestType" required defaultValue=""><option value="" disabled>{L(bn, "Choose…", "বেছে নিন…")}</option><option value="access">{L(bn, "Send me a copy of my data", "আমার তথ্যের কপি পাঠান")}</option><option value="correct">{L(bn, "Correct my data", "আমার তথ্য সংশোধন করুন")}</option><option value="delete">{L(bn, "Delete my data", "আমার তথ্য মুছে ফেলুন")}</option></select></label>}
    {kind === "general" && services.length > 0 && <label>{L(bn, "About (optional)", "বিষয় (ঐচ্ছিক)")}<select name="serviceSlug" defaultValue=""><option value="">{L(bn, "General question", "সাধারণ প্রশ্ন")}</option>{services.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}</select></label>}
    <div className="product-form-row">
      <label>{L(bn, "Your name", "আপনার নাম")}<input name="name" required maxLength={80} autoComplete="name" /></label>
      <label>{L(bn, "Phone / WhatsApp", "ফোন / হোয়াটসঅ্যাপ")}<input name="phone" type="tel" maxLength={20} autoComplete="tel" placeholder="01XXXXXXXXX" /></label>
    </div>
    <div className="product-form-row">
      <label>{L(bn, "Email (optional)", "ইমেইল (ঐচ্ছিক)")}<input name="email" type="email" maxLength={200} autoComplete="email" /></label>
      <label>{L(bn, "Best way to reach you", "যোগাযোগের সুবিধাজনক উপায়")}<select name="preferredContact" defaultValue="phone"><option value="phone">{L(bn, "Phone call", "ফোন কল")}</option><option value="whatsapp">WhatsApp</option><option value="messenger">Messenger</option><option value="email">{L(bn, "Email", "ইমেইল")}</option></select></label>
    </div>
    {kind === "product" && <label className="inquiry-qty">{L(bn, "Quantity", "পরিমাণ")}<input name="quantity" type="number" min={1} max={100} defaultValue={1} inputMode="numeric" /></label>}
    <label>{kind === "product" || kind === "restock" ? L(bn, "Message (optional)", "বার্তা (ঐচ্ছিক)") : L(bn, "Message", "বার্তা")}<textarea name="message" rows={3} maxLength={1000} required={kind === "general" || kind === "privacy"} /></label>
    <label className="inquiry-consent"><input type="checkbox" name="consent" required /><span>{L(bn, "I agree that OANRO may use these details to reply to me, as described in the ", "উত্তর দেওয়ার জন্য OANRO এই তথ্য ব্যবহার করতে পারবে — বিস্তারিত ")}<Link href="/privacy">{L(bn, "privacy notice", "প্রাইভেসি নোটিশে")}</Link>{bn ? " দেখুন।" : "."}</span></label>
    {error && <p className="inquiry-error" role="alert">{error}</p>}
    <button className="button brand-button" disabled={state === "sending"}>{state === "sending" ? L(bn, "Sending…", "পাঠানো হচ্ছে…") : L(bn, "Send", "পাঠান")}</button>
  </form>;
}
