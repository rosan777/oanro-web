"use client";
import { useEffect } from "react";
import { Localized } from "@/components/locale";
import Link from "@/components/locale-link";

// Friendly page for unexpected server errors, instead of a blank default screen.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main id="main-content" className="container empty-page">
    <p className="eyebrow"><Localized en="Something went wrong" bn="কিছু একটা সমস্যা হয়েছে" /></p>
    <h1><Localized en="We couldn't load this page." bn="পেজটি লোড করা যায়নি।" /></h1>
    <p><Localized en="Please try again. If it keeps happening, message us and we will fix it." bn="আবার চেষ্টা করুন। বারবার হলে আমাদের মেসেজ করুন, আমরা ঠিক করে দেব।" /></p>
    {error.digest && <p className="small-note">Ref: {error.digest}</p>}
    <div className="contact-actions"><button type="button" className="button brand-button" onClick={reset}><Localized en="Try again" bn="আবার চেষ্টা করুন" /></button><Link className="button light-button" href="/"><Localized en="Go to home" bn="হোমে যান" /></Link></div>
  </main>;
}
