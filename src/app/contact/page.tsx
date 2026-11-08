import type { Metadata } from "next";
import { requestLocale } from "@/lib/request-locale";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { contactLinks, getSiteContent } from "@/lib/site-content";
import { SocialLinks } from "@/components/social-icon";
import { Localized } from "@/components/locale";
import { ContactInquiry } from "@/components/contact-inquiry";
import { currentSession } from "@/lib/access";
import { projectTypes } from "@/lib/product-input";
// Title and description follow the page language (/bn = Bangla) so both versions can rank.
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale();
  return locale === "bn"
    ? {
        title: "যোগাযোগ",
        description:
          "পণ্য, সেবা বা পার্টনারশিপ নিয়ে OANRO-কে জিজ্ঞাসা করুন। মেসেজ বা ইনকোয়ারি পাঠান।",
      }
    : {
        title: "Contact",
        description:
          "Ask OANRO about products, services or partnerships. Message us or send an inquiry.",
      };
}
/** Contact and the project brief (approved design): the form is shown directly, with the brief questions. */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const content = await getSiteContent();
  const c = contactLinks(content);
  const type = String((await searchParams).type ?? "");
  const session = await currentSession().catch(() => null);
  return (
    <main id="main-content" className="o-section o-tech-page">
      <div className="o-project">
        <div className="o-project-note">
          <p className="o-eyebrow">
            <Localized en="LET’S MAKE ROOM FOR YOUR IDEA" bn="আপনার আইডিয়ার জন্য জায়গা" />
          </p>
          <h1>
            <Localized en="What are you thinking?" bn="কী ভাবছেন আপনি?" />
          </h1>
          <p>
            <Localized
              en="A clearer brief is a better beginning. Tell us about a project, a product or a partnership; we usually reply within one working day."
              bn="পরিষ্কার ব্রিফ মানে ভালো শুরু। প্রজেক্ট, পণ্য বা পার্টনারশিপ নিয়ে জানান; সাধারণত এক কর্মদিবসের মধ্যে উত্তর দিই।"
            />
          </p>
          <div className="contact-actions">
            {c.whatsapp && (
              <a className="button light-button" href={c.whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle size={17} />
                WhatsApp
              </a>
            )}
            {c.phone && (
              <a className="button light-button" href={`tel:${c.phone}`}>
                <Phone size={17} />
                {c.phone}
              </a>
            )}
            {c.email && (
              <a className="button light-button" href={`mailto:${c.email}`}>
                <Mail size={17} />
                {c.email}
              </a>
            )}
          </div>
          {content.features.socialIcons && (
            <SocialLinks socials={content.contact.socials} className="social-links is-large" />
          )}
        </div>
        <div className="o-panel o-brief">
          <ContactInquiry
            brief
            defaultType={
              projectTypes.includes(type as (typeof projectTypes)[number]) ? type : undefined
            }
            prefill={session ? { name: session.user.name, email: session.user.email } : undefined}
          />
        </div>
      </div>
    </main>
  );
}
