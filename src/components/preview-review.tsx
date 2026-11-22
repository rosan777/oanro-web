"use client";

import { useState } from "react";
import { useLocale } from "./locale";
import Link from "./locale-link";

const stages = [
  { label: ["Build", "বিল্ড"], command: "build preview", title: ["Preview assembled", "প্রিভিউ তৈরি হয়েছে"], detail: ["The booking page and its confirmation screen are ready to review.", "বুকিং পেজ ও নিশ্চিতকরণ স্ক্রিন এখন রিভিউয়ের জন্য প্রস্তুত।"], result: "booking.html → confirmation.html" },
  { label: ["Verify", "যাচাই"], command: "check booking", title: ["One request, one booking", "এক অনুরোধে একটি বুকিং"], detail: ["Retrying the same request returns the original receipt.", "একই অনুরোধ আবার পাঠালে প্রথম রসিদটিই ফেরত আসে।"], result: "retry(request_041) → receipt_041" },
  { label: ["Handoff", "হস্তান্তর"], command: "prepare handoff", title: ["Ready for client review", "ক্লায়েন্ট রিভিউয়ের জন্য প্রস্তুত"], detail: ["The preview and the test result travel together for approval.", "অনুমোদনের জন্য প্রিভিউ ও পরীক্ষার ফল একসঙ্গে দেওয়া হয়।"], result: "preview + receipt check → review" },
];

export function PreviewReview() {
  const bn = useLocale().locale === "bn";
  const [selected, select] = useState(0);
  const stage = stages[selected];
  const language = bn ? 1 : 0;
  return (
    <section className="preview-review" aria-label={bn ? "প্রজেক্ট রিভিউয়ের উদাহরণ" : "Example project review"}>
      <header><span aria-hidden="true">● ● ●</span> {bn ? "স্টুডিও / নমুনা বুকিং প্রজেক্ট" : "studio / example booking project"}</header>
      <div role="group" aria-label={bn ? "ধাপ বেছে নিন" : "Choose a project stage"}>
        {stages.map((item, index) => <button key={item.command} type="button" aria-pressed={index === selected} onClick={() => select(index)}>{item.label[language]}</button>)}
      </div>
      <div aria-live="polite" aria-atomic="true">
        <div className="preview-result" key={stage.command}>
          <code>$ {stage.command}</code>
          <h3>{stage.title[language]}</h3><p>{stage.detail[language]}</p>
          <samp>{stage.result}</samp>
        </div>
      </div>
      <Link href="/services/web#transaction-study">{bn ? "বুকিং প্রক্রিয়া দেখুন" : "Inspect the booking flow"} ↗</Link>
    </section>
  );
}
