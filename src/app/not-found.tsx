import Link from "next/link";
import { Localized } from "@/components/locale";
export default function NotFound() { return <main id="main-content" className="container empty-page"><p className="eyebrow"><Localized en="Not available" bn="পাওয়া যাচ্ছে না" /></p><h1><Localized en="This page isn't here." bn="এই পেজটি এখানে নেই।" /></h1><p><Localized en="The product may be unavailable, or the link may have changed." bn="পণ্যটি হয়তো আর নেই, অথবা লিংকটি বদলে গেছে।" /></p><Link href="/" className="button brand-button"><Localized en="Return to OANRO" bn="OANRO-তে ফিরে যান" /></Link></main>; }
