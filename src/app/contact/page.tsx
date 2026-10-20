import type { Metadata } from "next";
import { requestLocale } from "@/lib/request-locale";
import { Mail } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { Localized } from "@/components/locale";
import { MessageReveal } from "@/components/message-reveal";
// Title and description follow the page language (/bn = Bangla) so both versions can rank.
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale();
  return locale === "bn" ? { title: "যোগাযোগ", description: "পণ্য, সেবা বা পার্টনারশিপ নিয়ে OANRO-কে জিজ্ঞাসা করুন। মেসেজ বা ইনকোয়ারি পাঠান।" } : { title: "Contact", description: "Ask OANRO about products, services or partnerships. Message us or send an inquiry." };
}
export default function ContactPage() {
  const config = getSiteConfig();
  return <main id="main-content" className="container legal-page">
    <p className="eyebrow"><Localized en="Contact OANRO" bn="OANRO-তে যোগাযোগ" /></p>
    <h1><Localized en="Let's talk." bn="চলুন কথা বলি।" /></h1>
    <p className="legal-intro"><Localized en="Questions about a product, a service or a partnership? Send a message and we'll reply, usually within one working day." bn="পণ্য, সেবা বা পার্টনারশিপ নিয়ে প্রশ্ন? বার্তা পাঠান, সাধারণত এক কর্মদিবসের মধ্যে উত্তর দিই।" /></p>
    <div className="contact-actions">
      <MessageReveal />
      {config.whatsappUrl && <a className="button light-button" href={config.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>}
      {config.contactEmail && <a className="button light-button" href={`mailto:${config.contactEmail}`}><Mail size={17} />{config.contactEmail}</a>}
    </div>
  </main>;
}
