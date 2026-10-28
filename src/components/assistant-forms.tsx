"use client";
import { useState, type FormEvent } from "react";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { formatDhaka } from "@/lib/dhaka-time";
import type { TrackedOrder } from "@/lib/assistant/types";
import { useLocale } from "./locale";

const postJson = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });

/** Secure tracking form: the order number and phone go straight to the server. They are never added to the chat, never sent to the AI and never logged. */
export function TrackingForm({ onBack }: { onBack: () => void }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const [busy, setBusy] = useState(false); const [order, setOrder] = useState<TrackedOrder | null>(null); const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setBusy(true); setError(""); setOrder(null);
    const res = await postJson("/api/assistant/track", { code: f.get("code"), phone: f.get("phone") }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { order?: TrackedOrder } | undefined;
    setBusy(false); form.reset();
    if (data?.order) return setOrder(data.order);
    setError(res?.status === 429 ? t("Too many attempts. Please wait a few minutes and try again.", "অনেকবার চেষ্টা হয়েছে। কয়েক মিনিট পর আবার চেষ্টা করুন।")
      : res && res.status >= 500 || !res ? t("Tracking isn't available right now. Please try again later or contact us.", "ট্র্যাকিং এই মুহূর্তে পাওয়া যাচ্ছে না। পরে চেষ্টা করুন বা আমাদের জানান।")
      : t("We couldn't find that order. Check the order number (starts with OA-) and use the phone number you ordered with.", "অর্ডারটি পাওয়া যায়নি। অর্ডার নম্বর (OA- দিয়ে শুরু) ও অর্ডারের ফোন নম্বর ঠিক আছে কিনা দেখুন।"));
  }
  return <form className="asst-form" onSubmit={submit} autoComplete="off">
    <button type="button" className="asst-link-btn" onClick={onBack} style={{ justifySelf: "start" }}><ArrowLeft size={14} aria-hidden="true" /> {t("Back to chat", "চ্যাটে ফিরুন")}</button>
    <h3 style={{ fontSize: "1rem" }}><PackageSearch size={18} aria-hidden="true" style={{ verticalAlign: "-3px" }} /> {t("Track your order", "অর্ডার ট্র্যাক করুন")}</h3>
    <p className="asst-notice">{t("These details go straight to our server to look up your order. They are not part of the chat and are not saved by the assistant.", "এই তথ্য সরাসরি আমাদের সার্ভারে যায়। এগুলো চ্যাটের অংশ নয় এবং সহকারী এগুলো সংরক্ষণ করে না।")}</p>
    <label>{t("Order number", "অর্ডার নম্বর")}<input name="code" required placeholder="OA-…" autoComplete="off" autoCapitalize="characters" maxLength={30} /></label>
    <label>{t("Phone number", "ফোন নম্বর")}<input name="phone" required inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="off" maxLength={20} /></label>
    <button className="asst-add" type="submit" disabled={busy} style={{ justifySelf: "start" }}>{busy ? t("Checking…", "দেখা হচ্ছে…") : t("Track order", "ট্র্যাক করুন")}</button>
    <div aria-live="polite">
      {error && <p className="asst-msg is-error" role="alert">{error}</p>}
      {order && <div className="asst-ok asst-timeline"><strong>{order.code}</strong><br />{bn ? order.stageLabel.bn : order.stageLabel.en}
        {order.updatedAt && <><br />{t("Updated", "হালনাগাদ")}: {formatDhaka(order.updatedAt, locale, { year: true })}</>}
        {order.courier && <><br />{t("Courier", "কুরিয়ার")}: {order.courier}{order.trackingCode ? ` · ${order.trackingCode}` : ""}</>}</div>}
    </div>
  </form>;
}

/** "Message our team": name, mobile and a message go to the admin Inquiries inbox, marked as coming from the assistant and from this page. Success is shown only after the server saved it. */
export function HandoffForm({ onBack, onDone, human }: { onBack: () => void; onDone: (text: string) => void; human: { whatsapp: string; messenger: string } }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError("");
    const res = await postJson("/api/assistant/handoff", { name: f.get("name"), phone: f.get("phone"), email: f.get("email"), message: f.get("message"), page: window.location.pathname, preferredContact: f.get("preferredContact") || undefined, consent: f.get("consent") === "on", includeSummary: f.get("summary") === "on", website: f.get("website"), locale }).catch(() => null);
    setBusy(false);
    if (res?.ok) return onDone(t("Thank you! Your message was sent to our team. They will use your mobile number to get back to you. I can't promise exactly when.", "ধন্যবাদ! আপনার বার্তা আমাদের টিমের কাছে পাঠানো হয়েছে। তারা আপনার মোবাইল নম্বরে যোগাযোগ করবে। ঠিক কখন, তা আমি নিশ্চিত করে বলতে পারছি না।"));
    setError(res?.status === 429 ? t("Too many messages. Please try again later.", "অনেকগুলো বার্তা হয়েছে। পরে আবার চেষ্টা করুন।") : res?.status === 400 ? t("Please check your name, your mobile number (like 01XXXXXXXXX) and your message.", "নাম, মোবাইল নম্বর (যেমন 01XXXXXXXXX) ও বার্তা ঠিক আছে কিনা দেখুন।") : t("We couldn't send your message. Nothing was sent. Please try again or use the Contact page.", "বার্তা পাঠানো যায়নি। কিছুই যায়নি। আবার চেষ্টা করুন বা যোগাযোগ পেজ ব্যবহার করুন।"));
  }
  return <form className="asst-form" onSubmit={submit}>
    <button type="button" className="asst-link-btn" onClick={onBack} style={{ justifySelf: "start" }}><ArrowLeft size={14} aria-hidden="true" /> {t("Back to chat", "চ্যাটে ফিরুন")}</button>
    <h3 style={{ fontSize: "1rem" }}>{t("Message our team", "আমাদের টিমকে বার্তা পাঠান")}</h3>
    <label>{t("Your name", "আপনার নাম")}<input name="name" required maxLength={80} autoComplete="name" /></label>
    <label>{t("Mobile number", "মোবাইল নম্বর")}<input name="phone" required inputMode="tel" placeholder="01XXXXXXXXX" maxLength={20} autoComplete="tel" /></label>
    <label>{t("Your message", "আপনার বার্তা")}<textarea name="message" required minLength={3} maxLength={600} rows={4} placeholder={t("Tell us how we can help…", "কীভাবে সাহায্য করতে পারি লিখুন…")} /></label>
    <label>{t("Email (optional)", "ইমেইল (ঐচ্ছিক)")}<input name="email" type="email" maxLength={200} autoComplete="email" /></label>
    <label>{t("Best way to reach you", "যোগাযোগের পছন্দ")}<select name="preferredContact" defaultValue=""><option value="">{t("Any", "যেকোনো")}</option><option value="phone">{t("Phone call", "ফোন")}</option><option value="whatsapp">WhatsApp</option><option value="email">{t("Email", "ইমেইল")}</option><option value="messenger">Messenger</option></select></label>
    <label className="asst-check"><input type="checkbox" name="consent" required /><span>{t("I agree that OANRO may use these details to reply to my message, as described in the Privacy notice.", "আমার বার্তার উত্তর দিতে OANRO এই তথ্য ব্যবহার করতে পারে, গোপনীয়তা নোটিশ অনুযায়ী — আমি সম্মত।")}</span></label>
    <label className="asst-check"><input type="checkbox" name="summary" /><span>{t("Also attach a short summary of my chat (personal details removed).", "আমার চ্যাটের একটি সংক্ষিপ্ত সারাংশও (ব্যক্তিগত তথ্য বাদ দিয়ে) সাথে দিন।")}</span></label>
    <div className="asst-hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <button className="asst-add" type="submit" disabled={busy} style={{ justifySelf: "start" }}>{busy ? t("Sending…", "পাঠানো হচ্ছে…") : t("Send message", "বার্তা পাঠান")}</button>
    {error && <p className="asst-msg is-error" role="alert">{error}</p>}
    {(human.whatsapp || human.messenger) && <p className="asst-notice">{t("Prefer chatting yourself? ", "নিজে চ্যাট করতে চান? ")}{human.whatsapp && <a href={human.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}{human.whatsapp && human.messenger && " · "}{human.messenger && <a href={human.messenger} target="_blank" rel="noopener noreferrer">Messenger</a>}</p>}
  </form>;
}
