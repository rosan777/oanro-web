import Link from "@/components/locale-link";
import { Localized } from "@/components/locale";
/** A friendly dead end: what happened, and three useful ways forward. */
export default function NotFound() {
  return <main id="main-content" className="container empty-page empty-designed">
    <div className="empty-art" aria-hidden="true"><span>4</span><i /><span>4</span></div>
    <p className="eyebrow"><Localized en="Not available" bn="পাওয়া যাচ্ছে না" /></p>
    <h1><Localized en="This page isn't here." bn="এই পেজটি এখানে নেই।" /></h1>
    <p><Localized en="It may have moved, or the product is no longer in the store." bn="হয়তো সরানো হয়েছে, অথবা পণ্যটি আর স্টোরে নেই।" /></p>
    <div className="empty-actions">
      <Link href="/#products" className="button brand-button"><Localized en="Browse the store" bn="স্টোর দেখুন" /></Link>
      <Link href="/#studio" className="button light-button"><Localized en="OANRO Studio" bn="OANRO স্টুডিও" /></Link>
      <Link href="/contact" className="button light-button"><Localized en="Contact us" bn="যোগাযোগ" /></Link>
    </div>
  </main>;
}
