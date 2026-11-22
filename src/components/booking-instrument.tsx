"use client";

import Image from "next/image";
import { useState } from "react";

export default function BookingInstrument({ bn, interactive }: { bn: boolean; interactive: boolean }) {
  const [open, setOpen] = useState(true);
  const [appearance, setAppearance] = useState("system");
  return (
    <figure className="print-instrument">
      {open ? (
        <iframe id="booking-view" src={`/studies/instrument/booking.html?lang=${bn ? "bn" : "en"}&appearance=${appearance}`} title={bn ? "থ্রিডি বুকিং মডেল" : "Interactive booking model"} />
      ) : (
        <Image src="/images/booking-instrument.jpg" loading="eager" width={481} height={261} sizes="(max-width: 760px) 90vw, 46vw"
          alt={bn ? "ল্যাপটপ, গেটওয়ে, অ্যাপ সার্ভার ও ডেটাবেসের থ্রিডি মডেল" : "A laptop, identity gateway, application server and transaction store"} />
      )}
      <figcaption>
        <strong>{bn ? "একটি বুকিং কীভাবে নিশ্চিত হয়?" : "How does a booking get confirmed?"}</strong>
        <p>{bn ? "গেটওয়ে পরিচয় যাচাই করে। সার্ভার সময়টি পরীক্ষা করে বুকিং ও তার নিশ্চিতকরণ একসঙ্গে সংরক্ষণ করে।" : "The gateway checks identity. The server checks the time slot and saves the booking and its confirmation together."}</p>
        {interactive && <button type="button" aria-expanded={open} onClick={() => { setAppearance(document.documentElement.dataset.appearance || "system"); setOpen(!open); }}>
          {open ? (bn ? "মডেল বন্ধ করুন" : "Close model") : (bn ? "থ্রিডি মডেল দেখুন" : "Explore the 3D model")}
        </button>}
      </figcaption>
    </figure>
  );
}
