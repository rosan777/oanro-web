// Company profile (/company-profile): every section, text and list the owner edits in Admin → Company profile.
// Pure data (no server imports) so the page, the admin editor and tests share it.
import type { Bi } from "./content";

/** Icons the admin can pick for cards and rows (mapped to Lucide icons in components/profile-icon.tsx). */
export const profileIcons = ["cpu", "life-buoy", "cloud-cog", "briefcase", "target", "telescope", "code", "shopping-bag", "layout-dashboard", "bot",
  "layers", "server-cog", "microchip", "monitor-smartphone", "workflow", "cloud-upload", "network", "activity", "flask", "boxes", "plug", "chart",
  "sparkles", "shopping-cart", "scale", "cloud", "building", "shield-check", "newspaper", "graduation-cap", "puzzle", "badge-check", "refresh",
  "lock", "mail", "globe", "users", "rocket", "zap", "database", "smartphone", "settings", "check"] as const;
export type ProfileIconName = typeof profileIcons[number];

/** How a section is drawn. Every kind uses the same fields, so the admin can add any kind as a new section. */
export const sectionKinds = {
  cover: { label: "Cover (big title, focus cards)", hint: "Small label: text after | is shown smaller (e.g. IT Services|& E-commerce). Title: use | for a new line; the second line is green. Body: tagline. Items: focus cards." },
  intro: { label: "Text + side cards", hint: "Body: paragraphs (blank line between them). Group 1: side cards. Group 2: small fact boxes." },
  cards: { label: "Card grid", hint: "Group 1: cards (icon, title, short text, optional bullet list — one line per bullet). Group 2 (optional): small tags shown above the cards, with its heading." },
  split: { label: "Feature panel + numbered list", hint: "Group heading + Paragraph: the green panel on the left. Items: numbered points on the right (title only)." },
  groups: { label: "Grouped list (columns)", hint: "Each group is a column with a heading; each item is a row with icon, title and one-line text." },
  values: { label: "Letter cards (values)", hint: "Each item is a card; the first letter of its title is shown big." },
  tech: { label: "Technology logos", hint: "Each group is a box; each item is a technology. Logo: the Simple Icons name, e.g. react, nextdotjs, postgresql." },
  notice: { label: "Notice box + steps", hint: "Body: the notice text. Items: numbered steps. The contact email is added automatically." },
  thanks: { label: "Thank you + terms", hint: "Group 1: contact rows (title = label, text = value). Group 2: terms (one item per point). Body: closing line." },
} as const;
export type SectionKind = keyof typeof sectionKinds;

export type ProfileItem = { icon: string; title: Bi; text: Bi; list: Bi; logo: string };
export type ProfileGroup = { title: Bi; items: ProfileItem[] };
export type ProfileSection = { id: string; kind: SectionKind; enabled: boolean; dark: boolean; columns: number;
  eyebrow: Bi; title: Bi; body: Bi; strip: Bi; signature: boolean; groups: ProfileGroup[] };
export type CompanyProfile = { sections: ProfileSection[] };

const e = (en: string): Bi => ({ en, bn: "" });
const item = (icon: string, title: string, text = "", list: string[] = [], logo = ""): ProfileItem => ({ icon, title: e(title), text: e(text), list: e(list.join("\n")), logo });
const tech = (name: string, logo: string) => item("", name, "", [], logo);
const group = (title: string, items: ProfileItem[]): ProfileGroup => ({ title: e(title), items });
const section = (id: string, kind: SectionKind, p: Partial<Omit<ProfileSection, "eyebrow" | "title" | "body" | "strip">> & { eyebrow?: string; title?: string; body?: string; strip?: string }): ProfileSection => ({
  id, kind, enabled: true, dark: false, columns: 2, signature: false, groups: [],
  ...p, eyebrow: e(p.eyebrow ?? ""), title: e(p.title ?? ""), body: e(p.body ?? ""), strip: e(p.strip ?? "") });

export function defaultProfile(): CompanyProfile {
  return { sections: [
    section("cover", "cover", { dark: true, eyebrow: "IT Services|& E-commerce", title: "Company|Profile", body: "A brand built for what's next.", strip: "oanro.com  •  support@oanro.com  •  Licensed business",
      groups: [group("", [item("cpu", "Software, Embedded & AI"), item("life-buoy", "Managed Services"), item("cloud-cog", "Cloud Architecture & DevOps"), item("briefcase", "Business & Operations Support")])] }),
    section("profile", "intro", { eyebrow: "Who we are", title: "Company profile", strip: "Originality • Ambition • Next-generation • Reliability • Opportunity",
      body: "OANRO is a forward-looking company working where technology meets commerce. We design, build and run software for businesses of every size, and we run an online store of carefully selected products.\n\nFrom a first website to an enterprise platform with AI built in, one team takes responsibility from the first conversation to long-term support. We work with clients around the world, remotely and on clear written terms.\n\nOur name is our standard: Originality, Ambition, Next-generation thinking, Reliability and Opportunity in every project we take on.",
      groups: [group("", [item("target", "Mission", "Give every business dependable, modern technology that saves time, reduces cost and supports growth."), item("telescope", "Vision", "Become a trusted global technology partner for businesses building what comes next.")]),
        group("", [item("", "Business", "IT services (E-commerce)"), item("", "Clients", "Worldwide"), item("", "Engagement", "Remote first")])] }),
    section("services", "cards", { eyebrow: "What we do", title: "Our services", body: "Four service lines that cover a business from the first line of code to daily operations.", strip: "Plan → Build → Launch → Run → Grow",
      groups: [group("", [
        item("cpu", "Software, Embedded & AI", "", ["Custom software, hardware and AI agent development", "Web, mobile and desktop applications", "Business-specific solutions", "Strategic partner and white-label products", "API design and system integration"]),
        item("life-buoy", "Managed Services", "", ["Application maintenance and updates", "Infrastructure maintenance and monitoring", "On-premise, physical and hybrid cloud setup", "Backups, security patching and access control", "Monthly health reports"]),
        item("cloud-cog", "Cloud Architecture & DevOps", "", ["Cloud, hybrid and on-premise provisioning", "CI/CD and DevSecOps pipelines", "Deployment, scaling and monitoring", "Disaster recovery planning", "Performance and cost optimisation"]),
        item("briefcase", "Business & Operations Support", "", ["On-call technical support", "Legacy system modernisation", "Business process integration and automation", "E-commerce setup and operations", "Tech talent augmentation"])])] }),
    section("solutions", "groups", { dark: true, columns: 4, eyebrow: "Solutions", title: "Streamline your business", body: "Twenty proven solution types, shaped around each client's process, size and budget.", signature: true,
      groups: [
        group("Build", [item("code", "Custom Software Development", "Built around your exact workflow"), item("layers", "SaaS Platform Development", "Multi-tenant products, billing and admin"), item("monitor-smartphone", "Mobile, Web & TV Applications", "One product on every screen"), item("shopping-cart", "E-commerce Platforms", "Catalogue, checkout and payments"), item("sparkles", "Custom AI & Agents", "Assistants trained on your business")]),
        group("Automate & integrate", [item("layout-dashboard", "Enterprise ERP & CRM Systems", "Sales, stock, accounts and HR in one place"), item("workflow", "Business Process Automation", "Remove repeated manual work"), item("bot", "AI-Powered Automations", "Documents, email and support handled faster"), item("plug", "API & Systems Integration", "Connect the tools you already use"), item("chart", "Real-Time Data & Analytics", "Dashboards that show where to act")]),
        group("Cloud & scale", [item("cloud-cog", "Cloud Infra & DevSecOps", "Secure pipelines and automated releases"), item("cloud-upload", "Cloud Migration & Modernisation", "Move without downtime or data loss"), item("network", "Scalable, HA Architectures", "Built to stay up under load"), item("boxes", "Kubernetes & HA Scaling", "Containers that grow with demand"), item("microchip", "IoT & Embedded Solutions", "Devices and sensors linked to the cloud")]),
        group("Run & protect", [item("server-cog", "Managed IT & Cloud Services", "We run it, you focus on business"), item("activity", "Infrastructure Monitoring & SRE", "Problems found before users notice"), item("life-buoy", "Disaster Recovery Solutions", "Backups and tested recovery plans"), item("flask", "QA Automation & Testing", "Every release checked automatically"), item("scale", "Legal & Compliance Alignment", "Privacy, consent and data protection")])] }),
    section("values", "values", { eyebrow: "What drives us", title: "Values & philosophy", strip: "Client care • Honest delivery • Continuous improvement",
      groups: [group("", [item("", "Originality", "Our own ideas, shaped for each client."), item("", "Ambition", "We aim high and finish what we start."), item("", "Next-generation", "Modern tools, cloud and AI by default."), item("", "Reliability", "Clear scope, honest timelines, steady support."), item("", "Opportunity", "Technology that opens new doors.")])] }),
    section("philosophy", "split", { eyebrow: "Operating philosophy", title: "How we operate", signature: true,
      body: "Our strength is keeping systems reliable after launch, not only delivering them once. We stay with our clients as their business grows.",
      groups: [group("Your long-term technology partner", ["We own outcomes, not only tasks.", "We protect production stability before adding features.", "We share progress openly, every week.", "We adapt to each client's budget and constraints.", "We measure with real data and monitoring.", "We modernise step by step, without breaking what works.", "We keep client information confidential."].map(r => item("", r)))] }),
    section("domains", "cards", { columns: 4, eyebrow: "Where we work", title: "Industries & domains",
      body: "The same standard of engineering, security and support in every industry we work in.",
      groups: [group("", [item("cloud", "Cloud-native infrastructure", "Secure, scalable hosting with automated releases."), item("bot", "LLM workflows", "Assistants and automations that remove repeated work."), item("shopping-cart", "Online stores", "Catalogue, checkout, payments and order management."), item("building", "ERP, CRM & BI", "Sales, stock, accounts and reports in one system."),
        item("microchip", "Embedded & firmware", "Devices and sensors connected to the cloud."), item("shield-check", "Access & audit", "Roles, permissions, audit logs and backups."), item("newspaper", "News, CMS & blogs", "Content sites that are fast and easy to update."), item("graduation-cap", "Institution management", "Admissions, classes, results and fees online.")]),
        group("Industries we serve", ["Retail & E-commerce", "Infrastructure", "Artificial Intelligence", "Security", "Media", "Education", "Logistics", "Business IoT", "Business Operations", "Startups & SMEs"].map(n => item("", n)))] }),
    section("vision", "cards", { columns: 3, eyebrow: "Technological vision", title: "Let's find the best tech stack for your need",
      groups: [group("", [item("puzzle", "Context fit", "The right tool for each client's size, budget and goals, not the trendiest one."), item("badge-check", "Production standard", "Tested, secure and monitored from the first release."), item("refresh", "Lifecycle ownership", "We maintain and improve what we build, year after year.")])] }),
    section("tech", "tech", { columns: 3, eyebrow: "Our stack", title: "Tech we work with", strip: "Observability: OpenTelemetry • Prometheus • Grafana   |   Delivery: GitHub Actions • Docker • Vercel   |   Quality: Vitest • Playwright • ZAP",
      groups: [
        group("Languages & Runtimes", [tech("Go", "go"), tech("Node.js", "nodedotjs"), tech("Java", "openjdk"), tech("Python", "python"), tech("PHP", "php"), tech("TypeScript", "typescript")]),
        group("Frontend", [tech("React", "react"), tech("Next.js", "nextdotjs"), tech("Vue", "vuedotjs"), tech("Svelte", "svelte"), tech("Tailwind CSS", "tailwindcss"), tech("Vite", "vite")]),
        group("Databases", [tech("PostgreSQL", "postgresql"), tech("MySQL", "mysql"), tech("MongoDB", "mongodb"), tech("Redis", "redis"), tech("SQLite", "sqlite"), tech("Elasticsearch", "elasticsearch")]),
        group("Cloud & DevOps", [tech("AWS", "amazonwebservices"), tech("Google Cloud", "googlecloud"), tech("Docker", "docker"), tech("Kubernetes", "kubernetes"), tech("Terraform", "terraform"), tech("Vercel", "vercel")]),
        group("Mobile", [tech("Flutter", "flutter"), tech("React Native", "react"), tech("Swift", "swift"), tech("Kotlin", "kotlin"), tech("Expo", "expo"), tech("Android", "android")]),
        group("Messaging & Queues", [tech("RabbitMQ", "rabbitmq"), tech("Kafka", "apachekafka"), tech("NATS", "natsdotio"), tech("Redis Pub/Sub", "redis"), tech("AWS SQS", "amazonsqs"), tech("Webhooks", "")]),
        group("Testing & QA", [tech("Jest", "jest"), tech("Playwright", "playwright"), tech("Vitest", "vitest"), tech("Cypress", "cypress"), tech("JMeter", "apachejmeter"), tech("PyTest", "pytest")]),
        group("Security", [tech("OAuth2", "auth0"), tech("JWT", "jsonwebtokens"), tech("Vault", "vault"), tech("OWASP ZAP", "owasp"), tech("TLS/SSL", "letsencrypt"), tech("RBAC", "keycloak")]),
        group("Monitoring", [tech("Prometheus", "prometheus"), tech("Grafana", "grafana"), tech("Loki", "grafana"), tech("OpenTelemetry", "opentelemetry"), tech("Sentry", "sentry"), tech("ELK Stack", "elasticstack")]),
        group("AI & ML", [tech("PyTorch", "pytorch"), tech("TensorFlow", "tensorflow"), tech("OpenAI API", "openai"), tech("Claude", "claude"), tech("LangChain", "langchain"), tech("Hugging Face", "huggingface")]),
        group("APIs & Integration", [tech("REST", "openapiinitiative"), tech("GraphQL", "graphql"), tech("gRPC", ""), tech("OpenAPI", "swagger"), tech("Postman", "postman"), tech("Stripe", "stripe")]),
        group("Tools & Platforms", [tech("Git", "git"), tech("Linux", "linux"), tech("Nginx", "nginx"), tech("Figma", "figma"), tech("Notion", "notion"), tech("WordPress", "wordpress")])] }),
    section("portfolio", "notice", { eyebrow: "Our work", title: "Portfolio",
      body: "Because of confidentiality agreements and the terms we have with our clients, we cannot show our completed projects publicly on our website or in this profile. If you are interested, email us or send us a message through our website and we will gladly walk you through the work we have done.",
      groups: [group("Our projects are shared privately", [item("mail", "Write to us", "Tell us what kind of project you have in mind."), item("lock", "Private walkthrough", "We share relevant past work in a call or by email."), item("check", "Clear proposal", "You receive scope, timeline and a written quote.")])] }),
    section("thanks", "thanks", { dark: true, eyebrow: "Let's talk", title: "Thank|you.", signature: true,
      body: "Stay connected with OANRO. Tell us what you want to build, and we will reply with next steps and a clear quote.",
      groups: [group("Contact", [item("", "Web", "oanro.com"), item("", "Email", "support@oanro.com"), item("", "Business", "Licensed business")]),
        group("Terms & conditions", [item("", "OANRO believes the information in this profile is accurate at the time of publication and may update or change it without notice."),
          item("", "Services, prices and timelines are confirmed only in a written quote or agreement for each project."),
          item("", "All trademarks, product names, service names and logos shown belong to their respective owners."),
          item("", "No part of this document may be reproduced, modified, distributed or shared without prior written consent from OANRO.")])] }),
  ] };
}

/** A blank section of the chosen kind, used by "Add section" in the admin. */
export function blankSection(kind: SectionKind): ProfileSection {
  return section(`s-${Date.now().toString(36)}`, kind, { title: "New section", dark: kind === "cover" || kind === "thanks", columns: kind === "groups" ? 4 : kind === "tech" ? 3 : 2,
    groups: [group(kind === "groups" || kind === "tech" ? "Group" : "", [item(kind === "tech" ? "" : "check", "New item", "", [], "")])] });
}
export const blankItem = (): ProfileItem => item("check", "New item");
export const blankGroup = (): ProfileGroup => group("New group", [blankItem()]);

/** Text in the visitor's language; Bangla falls back to English when it is left empty. */
export const pickBi = (v: Bi, locale: string) => (locale === "bn" && v.bn.trim() ? v.bn : v.en);

// ---- Cleaning (everything from the admin is checked before it is saved) ----
const str = (v: unknown, max: number) => typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "";
const bi = (v: unknown, max: number): Bi => { const o = (v ?? {}) as Record<string, unknown>; return { en: str(o.en, max), bn: str(o.bn, max) }; };
const arr = (v: unknown, max: number) => Array.isArray(v) ? v.slice(0, max) : [];
const icon = (v: unknown) => (profileIcons as readonly string[]).includes(String(v)) ? String(v) : "";
const cleanItem = (v: unknown): ProfileItem => { const o = (v ?? {}) as Record<string, unknown>;
  return { icon: icon(o.icon), title: bi(o.title, 200), text: bi(o.text, 600), list: bi(o.list, 2000), logo: str(o.logo, 60).toLowerCase().replace(/[^a-z0-9]/g, "") }; };
const cleanGroup = (v: unknown): ProfileGroup => { const o = (v ?? {}) as Record<string, unknown>; return { title: bi(o.title, 120), items: arr(o.items, 40).map(cleanItem) }; };
export function cleanProfile(v: unknown): CompanyProfile {
  const o = (v ?? {}) as Record<string, unknown>; const ids = new Set<string>();
  const sections = arr(o.sections, 30).map((s, i): ProfileSection => { const x = (s ?? {}) as Record<string, unknown>;
    let id = str(x.id, 40).replace(/[^a-z0-9-]/gi, "") || `s-${i}`; while (ids.has(id)) id += "x"; ids.add(id);
    const kind = (String(x.kind) in sectionKinds ? String(x.kind) : "cards") as SectionKind;
    const columns = Math.min(4, Math.max(1, Math.round(Number(x.columns) || 2)));
    return { id, kind, enabled: x.enabled !== false, dark: x.dark === true, columns, signature: x.signature === true,
      eyebrow: bi(x.eyebrow, 120), title: bi(x.title, 200), body: bi(x.body, 4000), strip: bi(x.strip, 400), groups: arr(x.groups, 16).map(cleanGroup) };
  });
  return { sections };
}
/** Saved value (or nothing) → a complete profile. Nothing saved yet = the default profile. */
export function mergeProfile(saved: unknown): CompanyProfile {
  if (!saved || typeof saved !== "object" || !Array.isArray((saved as CompanyProfile).sections)) return defaultProfile();
  return upgradeOldDefaults(cleanProfile(saved));
}
/** A profile saved before a default text changed keeps the old wording; swap old default texts for the new ones (texts the owner wrote are kept). */
const oldDefaults: Record<string, string> = { "E-commerce & IT Services": "IT Services|& E-commerce", "IT Services (E-commerce)": "IT Services|& E-commerce" };
function upgradeOldDefaults(p: CompanyProfile): CompanyProfile {
  return { sections: p.sections.map(s => oldDefaults[s.eyebrow.en] ? { ...s, eyebrow: { ...s.eyebrow, en: oldDefaults[s.eyebrow.en] } } : s) };
}
