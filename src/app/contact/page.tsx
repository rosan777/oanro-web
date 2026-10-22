import type { Metadata } from "next";
import { requestLocale } from "@/lib/request-locale";
import { Mail, MessagesSquare, Phone, MessageCircle } from "lucide-react";
import { contactLinks, getSiteContent } from "@/lib/site-content";
import { SocialLinks } from "@/components/social-icon";
import { Localized } from "@/components/locale";
import { MessageReveal } from "@/components/message-reveal";
// Title and description follow the page language (/bn = Bangla) so both versions can rank.
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale();
  return locale === "bn" ? { title: "যোগাযোগ", description: "পণ্য, সেবা বা পার্টনারশিপ নিয়ে OANRO-কে জিজ্ঞাসা করুন। মেসেজ বা ইনকোয়ারি পাঠান।" } : { title: "Contact", description: "Ask OANRO about products, services or partnerships. Message us or send an inquiry." };
}
export default async function ContactPage() {
  const content = await getSiteContent(); const c = contactLinks(content);
  return <main id="main-content" className="container legal-page">
    <p className="eyebrow"><Localized en="Contact OANRO" bn="OANRO-তে যোগাযোগ" /></p>
    <h1><Localized en="Let's talk." bn="চলুন কথা বলি।" /></h1>
    <p className="legal-intro"><Localized en="Questions about a product, a service or a partnership? Send a message and we'll reply, usually within one working day." bn="পণ্য, সেবা বা পার্টনারশিপ নিয়ে প্রশ্ন? বার্তা পাঠান, সাধারণত এক কর্মদিবসের মধ্যে উত্তর দিই।" /></p>
    <div className="contact-actions">
      <MessageReveal />
      {c.whatsapp && <a className="button light-button" href={c.whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp</a>}
      {c.messenger && <a className="button light-button" href={c.messenger} target="_blank" rel="noreferrer"><MessagesSquare size={17} />Messenger</a>}
      {c.phone && <a className="button light-button" href={`tel:${c.phone}`}><Phone size={17} />{c.phone}</a>}
      {c.email && <a className="button light-button" href={`mailto:${c.email}`}><Mail size={17} />{c.email}</a>}
    </div>
    {content.features.socialIcons && <SocialLinks socials={content.contact.socials} className="social-links is-large" />}
  </main>;
}
