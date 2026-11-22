"use client";

import { useState } from "react";
import "./studio-product.css";

const studies = {
  benchmark: ["research/benchmark.html", "Follow a booking from browser to worker", "ব্রাউজার থেকে ওয়ার্কার পর্যন্ত বুকিং অনুসরণ করুন", "Trace the request through identity checks, storage and delivery. Inspect each handoff and replay a timeout.", "পরিচয় যাচাই, তথ্য সংরক্ষণ ও বার্তা পাঠানোর প্রতিটি ধাপ দেখুন। সময়সীমা পেরোলে কী ঘটে তা পরীক্ষা করুন।"],
  cutaway: ["transaction/A.html", "Inside a booking transaction", "বুকিং লেনদেনের ভেতরে", "Separate the layers and inspect when a booking and its notification become durable.", "স্তরগুলো আলাদা করে দেখুন কখন বুকিং ও তার বার্তা স্থায়ীভাবে সংরক্ষিত হয়।"],
  ledger: ["transaction/C.html", "Why a retry keeps the same receipt", "আবার চেষ্টা করলেও রসিদ একই থাকে কেন", "Compare the ledger before and after an interrupted response. A repeat request can recover the original result.", "উত্তর বাধাগ্রস্ত হওয়ার আগে ও পরে খতিয়ানটি মিলিয়ে দেখুন। একই অনুরোধে আগের ফলাফলটি ফেরত পাওয়া যায়।"],
  systems: ["instrument/service.html?model=systems", "Reserving the last unit", "শেষ পণ্যটি সংরক্ষণ", "Two orders compete for the last item. Inspect availability, reservation and dispatch from the shelf.", "শেষ পণ্যটির জন্য দুটি অর্ডার এসেছে। তাক থেকে পণ্য সংরক্ষণ ও পাঠানোর ধাপগুলো দেখুন।"],
  app: ["instrument/service.html?model=app", "Sending an update from an offline phone", "অফলাইন ফোনের আপডেট পাঠানো", "Inspect how a local edit waits in the device queue and reaches the server after reconnection.", "ফোনে করা পরিবর্তন কীভাবে অপেক্ষা করে এবং সংযোগ ফিরলে সার্ভারে পৌঁছায় তা দেখুন।"],
  strategy: ["instrument/service.html?model=strategy", "Migrating a service in stages", "ধাপে ধাপে সেবা স্থানান্তর", "Compare the original system, a limited traffic shift and rollback before switching all traffic.", "পুরোনো ব্যবস্থা, সীমিত ট্রাফিক স্থানান্তর এবং আগের ব্যবস্থায় ফেরার ধাপ তুলনা করুন।"],
} as const;

export default function TransactionStudy({ bn, study }: { bn: boolean; study: keyof typeof studies }) {
  const [open, setOpen] = useState(["app", "systems", "strategy"].includes(study));
  const [file, en, bangla, detail, translated] = studies[study];
  const serviceModel = file.startsWith("instrument/service.html");
  const title = bn ? bangla : en;
  return (
    <section id={study === "cutaway" ? "transaction-study" : `study-${study}`} aria-labelledby={`title-${study}`} className={serviceModel ? "transaction-study service-walkthrough" : "transaction-study"}>
      <h2 id={`title-${study}`}>{title}</h2>
      <p>{bn ? translated : detail}</p>
      {!serviceModel && <div className="study-choices">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? (bn ? "বন্ধ করুন" : "Close walkthrough") : (bn ? "ধাপগুলো দেখুন" : "Explore the walkthrough")}
        </button>
      </div>}
      {open && <iframe loading="lazy" title={title} src={`/studies/${file}${file.includes("?") ? "&" : "?"}lang=${bn ? "bn" : "en"}`} />}
    </section>
  );
}
