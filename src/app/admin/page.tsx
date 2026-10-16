import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireOwnerPage } from "@/lib/admin-guard";
import { Localized } from "@/components/locale";
import { CreateCollection } from "@/components/collection-admin";
import { SectionSwitch } from "@/components/section-switch";
import { getOwnerCatalog, getOwnerServices } from "@/lib/store-products";
import { getOwnerPulseStories, getSectionState } from "@/lib/website-sections";
import { presetLabel } from "@/lib/categories";

function Card({ href, label, title, detail, on, children }: { href: string; label: string; title: string; detail: string; on: boolean; children: React.ReactNode }) {
  return <div className={`admin-card ${on ? "is-on" : "is-off"}`}>
    <Link href={href} className="admin-card-link"><small>{label}</small><strong>{title}</strong><span>{detail}</span><em>Open <ArrowUpRight size={15} aria-hidden="true" /></em></Link>
    {children}
  </div>;
}
export default async function AdminPage() {
  await requireOwnerPage();
  const [catalog, services, stories, sections] = await Promise.all([getOwnerCatalog(), getOwnerServices(), getOwnerPulseStories(), getSectionState()]);
  const live = catalog.collections.filter(c => c.status === "published").length + (sections.services ? 1 : 0) + (sections["global-pulse"] ? 1 : 0);
  return <main id="main-content" className="container auth-page admin-hub">
    <h1><Localized en="Owner workspace" bn="Owner workspace" /></h1>
    <p><Localized en="Each card is one part of the website. ON = visible to customers, OFF = hidden. Open a card to edit its content." bn="প্রতিটি কার্ড ওয়েবসাইটের একটি অংশ। ON = গ্রাহকরা দেখতে পাবেন, OFF = লুকানো। কনটেন্ট এডিট করতে কার্ড খুলুন।" /></p>
    <p className="admin-live-count"><strong>{live}</strong> section{live === 1 ? "" : "s"} live on the website</p>
    {!catalog.ready && <p className="admin-callout">Product sections need the latest database migration. Run <code>npm run db:migrate</code>, then reload.</p>}
    <h2>Product sections</h2>
    <div className="admin-card-grid">
      {catalog.collections.map(c => <Card key={c.id} href={`/admin/sections/${c.id}`} label={presetLabel[c.preset].en} title={c.nameEn} on={c.status === "published"}
        detail={`${c.publishedCount} published · ${c.productCount} total${c.productCount === 0 && (c.preset === "caps" || c.preset === "tech") ? " · showing placeholders" : c.productCount === 0 ? " · empty sections stay hidden" : ""}`}>
        <SectionSwitch kind="collection" id={c.id} on={c.status === "published"} name={c.nameEn} />
      </Card>)}
    </div>
    {catalog.ready && <CreateCollection />}
    <h2>Other sections</h2>
    <div className="admin-card-grid">
      <Card href="/admin/services" label="Tech solutions" title="Services" on={sections.services} detail={services.managed ? `${services.services.filter(s => s.status === "published").length} published · ${services.services.length} total` : "4 built-in services (import to edit)"}>
        <SectionSwitch kind="site" id="services" on={sections.services} name="Services" />
      </Card>
      <Card href="/admin/pulse" label="News strip" title="Global Pulse" on={sections["global-pulse"]} detail={`${stories.length} stor${stories.length === 1 ? "y" : "ies"}`}>
        <SectionSwitch kind="site" id="global-pulse" on={sections["global-pulse"]} name="Global Pulse" />
      </Card>
    </div>
  </main>;
}
