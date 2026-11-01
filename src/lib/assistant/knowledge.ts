// What JUNO may say about OANRO itself (the company, shop, Studio, services, contact), built only from content the owner
// already publishes on the site. Pure: the route loads the sources, tests pass their own. Nothing here is invented.
import type { CompanyProfile } from "../company-profile-data";
import type { Service } from "../catalog";
import { pick, type SiteContent } from "../site-content-data";
import { scoreFields, words } from "../smart-search";
import { content } from "./match";
import type { Lang } from "./types";

type Text = { en: string; bn: string };
export type KnowledgeEntry = {
  id: string;
  title: Text;
  /** The answer, written from published content. Bangla falls back to English when the owner has no Bangla text. */
  text: Text;
  /** Extra words a visitor may use that do not appear in the text. */
  keywords: string;
  /** Internal page that shows the full information. */
  href: string;
  /** Broad topics (company, shop, studio, contact) answer vague questions like "tell me about OANRO". */
  topic?: "company" | "shop" | "studio" | "contact" | "site";
};

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);
const bi = (en: string, bn: string): Text => ({ en, bn: bn || en });
const join = (parts: string[], sep = "\n\n") => parts.filter(Boolean).join(sep);

export type KnowledgeSources = {
  site: SiteContent;
  profile: CompanyProfile;
  services: Service[];
  /** Names of the shop's published product categories (for the "what do you sell" answer). */
  categories: string[];
  contact: { email: string; phone: string; whatsapp: boolean; messenger: boolean };
  live: boolean;
};

/** Every answerable fact as a small entry. Disabled profile sections are skipped, so only what is visible on the site is used. */
export function buildKnowledge(src: KnowledgeSources): KnowledgeEntry[] {
  const out: KnowledgeEntry[] = [];
  const t = (key: Parameters<typeof pick>[1]) => ({
    en: pick(src.site, key, "en"),
    bn: pick(src.site, key, "bn"),
  });
  const about = t("aboutPage.lede"),
    hero = t("hero.lede"),
    story = t("about.body"),
    studio = t("studio.lede");

  out.push({
    id: "company",
    title: bi("About OANRO", "OANRO সম্পর্কে"),
    topic: "company",
    href: "/about",
    keywords:
      "oanro company who we are about business brand website site page this team owner mission vision",
    text: {
      en: join([about.en, story.en, "Full story: [About OANRO](/about)."]),
      bn: join([
        about.bn || about.en,
        story.bn || story.en,
        "বিস্তারিত: [OANRO সম্পর্কে](/about)।",
      ]),
    },
  });
  const cats = src.categories.slice(0, 8).join(", ");
  out.push({
    id: "shop",
    title: bi("The OANRO shop", "OANRO শপ"),
    topic: "shop",
    href: "/products",
    keywords: "shop store products product items buy sell selling collection catalogue clothing",
    text: bi(
      join([
        hero.en,
        cats ? `Right now the shop has: ${cats}.` : "",
        src.live
          ? ""
          : "The shop is still in preview: items and prices you see are examples, not live offers, and checkout isn't open yet.",
        "Tell me what you are looking for and I can search it, or browse the [shop](/products).",
      ]),
      join([
        hero.bn || hero.en,
        cats ? `এখন শপে আছে: ${cats}।` : "",
        src.live
          ? ""
          : "শপ এখনো প্রিভিউ অবস্থায়: দেখানো পণ্য ও দাম উদাহরণ মাত্র, চালু অফার নয়, আর চেকআউট এখনো খোলেনি।",
        "কী খুঁজছেন বললে আমি খুঁজে দেব, অথবা [শপ](/products) ঘুরে দেখুন।",
      ]),
    ),
  });

  const pk = src.site.packages;
  out.push({
    id: "studio",
    title: bi("OANRO Studio", "OANRO স্টুডিও"),
    topic: "studio",
    href: "/services",
    keywords:
      "studio services service software website web app application development developer it solutions build quote agency hire",
    text: {
      en: join([
        studio.en,
        pk.length ? `Packages: ${pk.map(p => pick2(p.name, "en")).join(", ")}.` : "",
        "Quotes are written by the team: use “Get a free quote” on the [Contact](/contact) page. See all [services](/services).",
      ]),
      bn: join([
        studio.bn || studio.en,
        pk.length ? `প্যাকেজ: ${pk.map(p => pick2(p.name, "bn")).join(", ")}।` : "",
        "কোট টিম নিজে লিখিত আকারে দেয়: [যোগাযোগ](/contact) পাতায় “ফ্রি কোট নিন” ব্যবহার করুন। সব [সেবা](/services) দেখুন।",
      ]),
    },
  });
  for (const p of pk)
    out.push({
      id: `package:${p.name.en}`,
      title: p.name,
      href: "/services",
      keywords: `package plan studio ${p.for.en}`,
      text: {
        en: `${p.name.en} — for ${p.for.en.toLowerCase()}. Includes: ${p.includes.map(i => i.en).join("; ")}.`,
        bn: `${p.name.bn || p.name.en} — ${p.for.bn || p.for.en}। যা থাকে: ${p.includes.map(i => i.bn || i.en).join("; ")}।`,
      },
    });
  for (const s of src.services)
    out.push({
      id: `service:${s.slug}`,
      title: bi(s.title, s.bn?.title ?? ""),
      href: `/services/${s.slug}`,
      keywords: `service studio ${s.category ?? ""}`,
      text: {
        en: `${s.title}: ${join([s.text, s.detail], " ")} More: [${s.title}](/services/${s.slug}).`,
        bn: `${s.bn?.title || s.title}: ${join([s.bn?.text || s.text, s.bn?.detail || s.detail], " ")} বিস্তারিত: [${s.bn?.title || s.title}](/services/${s.slug})।`,
      },
    });
  for (const f of src.site.faq)
    out.push({
      id: `faq:${f.q.en}`,
      title: f.q,
      href: "/services",
      keywords: "studio services project",
      text: bi(f.a.en, f.a.bn),
    });

  // Company profile: only sections the owner shows. Cards become "Title: bullets", intro/split/values become their text.
  for (const sec of src.profile.sections) {
    if (!sec.enabled) continue;
    const title = sec.title.en.replace(/\|/g, " ").trim() || sec.id;
    const titleBn = (sec.title.bn || "").replace(/\|/g, " ").trim();
    const lines = (bn: boolean) =>
      sec.groups.flatMap(g => {
        const gt = (bn ? g.title.bn || g.title.en : g.title.en).trim();
        const rows = g.items
          .map(i => {
            const name = (bn ? i.title.bn || i.title.en : i.title.en).trim();
            const text = (bn ? i.text.bn || i.text.en : i.text.en).trim();
            const list = (bn ? i.list.bn || i.list.en : i.list.en)
              .split("\n")
              .map(x => x.trim())
              .filter(Boolean);
            return name
              ? `- ${join([name, text], ": ")}${list.length ? ` (${list.join("; ")})` : ""}`
              : "";
          })
          .filter(Boolean);
        return rows.length ? [gt ? `${gt}:` : "", ...rows] : [];
      });
    if (
      sec.kind === "cover" ||
      sec.kind === "tech" ||
      sec.kind === "notice" ||
      sec.kind === "thanks"
    )
      continue; // logos, covers and legal footers add noise, not answers
    const bodyEn = sec.body.en.trim(),
      bodyBn = (sec.body.bn || sec.body.en).trim();
    if (!bodyEn && !lines(false).length) continue;
    out.push({
      id: `profile:${sec.id}`,
      title: bi(title, titleBn),
      href: "/company-profile",
      topic: sec.id === "profile" ? "company" : undefined,
      keywords: `company profile ${sec.eyebrow.en}`,
      text: {
        en: clip(
          join([bodyEn, ...lines(false).slice(0, 18)], "\n") +
            "\nMore: [Company profile](/company-profile).",
          1400,
        ),
        bn: clip(
          join([bodyBn, ...lines(true).slice(0, 18)], "\n") +
            "\nবিস্তারিত: [কোম্পানি প্রোফাইল](/company-profile)।",
          1400,
        ),
      },
    });
  }

  // Contact: only channels that are actually set up.
  const ways = [
    src.contact.email && `email ${src.contact.email}`,
    src.contact.phone && `phone ${src.contact.phone}`,
    src.contact.whatsapp && "WhatsApp",
    src.contact.messenger && "Messenger",
  ].filter(Boolean) as string[];
  const contactBody = t("contact.body");
  out.push({
    id: "contact",
    title: bi("Contact", "যোগাযোগ"),
    topic: "contact",
    href: "/contact",
    keywords: "contact reach email phone whatsapp messenger call address message support team talk",
    text: {
      en: join([
        contactBody.en,
        ways.length ? `You can reach us by ${ways.join(", ")}.` : "",
        "Or use the [Contact](/contact) page or “Message our team” below.",
      ]),
      bn: join([
        contactBody.bn || contactBody.en,
        ways.length ? `যোগাযোগ করুন: ${ways.join(", ")}।` : "",
        "অথবা [যোগাযোগ](/contact) পাতা বা নিচের “আমাদের টিমকে বার্তা পাঠান” ব্যবহার করুন।",
      ]),
    },
  });
  out.push({
    id: "site",
    title: bi("This website", "এই ওয়েবসাইট"),
    topic: "site",
    href: "/",
    keywords: "website site page pages navigate menu where find sections",
    text: bi(
      "This site has the OANRO [shop](/products), OANRO Studio [services](/services), [guides](/guides), [Delivery & returns](/delivery-returns), the [Company profile](/company-profile), [About](/about) and [Contact](/contact). Ask me about any of them.",
      "এই সাইটে আছে OANRO [শপ](/products), OANRO স্টুডিওর [সেবা](/services), [গাইড](/guides), [ডেলিভারি ও রিটার্ন](/delivery-returns), [কোম্পানি প্রোফাইল](/company-profile), [আমাদের সম্পর্কে](/about) ও [যোগাযোগ](/contact)। যেকোনোটা নিয়ে জিজ্ঞাসা করুন।",
    ),
  });
  return out;
}
const pick2 = (b: Text, l: "en" | "bn") => (l === "bn" ? b.bn || b.en : b.en);

// Words that only mean "tell me about the business or this site": they pick a broad topic instead of a detailed entry.
const broad: { topic: NonNullable<KnowledgeEntry["topic"]>; re: RegExp }[] = [
  {
    topic: "company",
    re: /\b(about|who|what)\b.*\b(oanro|company|business|you guys|your company)\b|\boanro\b.*\b(about|who|what is|mean)\b|oanro(?:-র|র)?\s*(?:সম্পর্কে|কী|কি)|কোম্পানি|আমাদের সম্পর্কে/i,
  },
  {
    topic: "site",
    re: /\b(this|the)\s+(website|web\s?site|site|page)\b|\babout\s+(?:the\s+)?(?:website|site|page)\b|এই\s+(?:ওয়েবসাইট|সাইট|পেজ|পাতা)/i,
  },
  {
    topic: "shop",
    re: /\b(your|the)\s+(shop|store)\b|\bwhat\s+(?:do|does)\s+(?:you|oanro)\s+sell\b|\babout\s+(?:the\s+|your\s+)?products?\b|\bproducts?\s+(?:you|oanro)\b|(?:know|learn|tell).*\bproducts?\b/i,
  },
  {
    topic: "studio",
    re: /\b(studio|what\s+(?:do|does)\s+(?:you|oanro)\s+(?:do|build|offer)|your\s+services?|(?:web|software|app)\s+development)\b|আপনারা\s+কী\s+(?:করেন|বানান)/i,
  },
  {
    topic: "contact",
    re: /\b(contact|reach\s+(?:you|us)|phone\s+number|email\s+address|where\s+are\s+you|address)\b|যোগাযোগ/i,
  },
];

/** An unfinished or very general "I want to know…" with nothing after it: ask what about, rather than guess. */
export const vagueKnow = (text: string) =>
  /^\s*(?:i\s+)?(?:want|wanna|would\s+like|need)\s+to\s+(?:know|ask|learn)(?:\s+(?:more|something|about\s+something))?\s*[?.!]*\s*$|^\s*(?:tell\s+me|ask|info|information|details?|more)\s*(?:more)?\s*[?.!]*\s*$|^\s*(?:ami\s+)?jante\s+chai\s*$|^\s*আমি\s+জানতে\s+চাই\s*$/i.test(
    text,
  );

export type KnowledgeHit = { entry: KnowledgeEntry; confidence: number };

/** The entries that answer the message, best first, or [] when nothing matches well enough (so the caller can say so honestly). */
export function searchKnowledge(query: string, entries: KnowledgeEntry[], max = 3): KnowledgeHit[] {
  const q = query.trim();
  if (!q) return [];
  for (const b of broad)
    if (b.re.test(q)) {
      const hit = entries.find(e => e.topic === b.topic);
      if (hit) {
        // A broad question that also names something specific ("studio web development") should still prefer the specific entry.
        const specific = rankedBy(
          q,
          entries.filter(e => !e.topic),
          max,
        );
        return specific.length && specific[0].confidence >= 0.8
          ? specific
          : [{ entry: hit, confidence: 0.9 }];
      }
    }
  return rankedBy(q, entries, max);
}
// Question words that say nothing about the topic ("who won…" must not match "Who owns the website").
const filler = new Set(
  "who whom whose when where why which whats won win was were will would should could been being than then there their they them this that these those from into about also just very much many more most some such only own".split(
    " ",
  ),
);
function rankedBy(q: string, entries: KnowledgeEntry[], max: number): KnowledgeHit[] {
  const qs = content(q).filter(w => !filler.has(w) && (w.length > 2 || /\p{N}/u.test(w)));
  if (!qs.length) return [];
  const scored = entries
    .map(e => {
      // A match has to hit the entry's title or keywords: a word that only appears somewhere in a long body is not enough ("cap" is a product question, not a company one).
      const head = [
        { text: e.title.en, weight: 3 },
        { text: e.title.bn, weight: 3 },
        { text: e.keywords, weight: 1 },
      ];
      const hit = qs.filter(w => scoreFields(w, head) > 0).length;
      if (!hit) return { entry: e, confidence: 0 };
      const coverage = hit / qs.length;
      const named = words(e.title.en + " " + e.title.bn).some(w => qs.includes(w)) ? 1 : 0;
      const body = Math.min(
        1,
        scoreFields(qs.join(" "), [{ text: e.text.en + " " + e.text.bn, weight: 1 }]) /
          (qs.length * 2),
      );
      return { entry: e, confidence: 0.6 * coverage + 0.25 * named + 0.15 * body };
    })
    .filter(h => h.confidence >= 0.55)
    .sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, max);
}

/** The reply for the best entry, in the visitor's language (Banglish gets the English text). */
export const knowledgeText = (hit: KnowledgeHit, lang: Lang) =>
  lang === "bn" ? hit.entry.text.bn : hit.entry.text.en;

/** A short factual summary the AI always sees, so even a plain "what is OANRO?" is answered from real content. */
export const knowledgeDigest = (entries: KnowledgeEntry[]) =>
  clip(
    entries
      .filter(e => e.topic)
      .map(e => `${e.title.en}: ${e.text.en.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}`)
      .join("\n"),
    1800,
  );
