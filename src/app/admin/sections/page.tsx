import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-guard";
import { Localized } from "@/components/locale";
import { CreateCollection } from "@/components/collection-admin";
import { SectionSwitch } from "@/components/section-switch";
import { getOwnerCatalog, getOwnerServices } from "@/lib/store-products";
import { getOwnerPulseStories, getSectionState } from "@/lib/website-sections";
import { presetLabel } from "@/lib/categories";
import { productPermissions } from "@/lib/permissions";

function Card({ href, label, title, detail, on, children }: { href: string; label: string; title: string; detail: string; on: boolean; children?: React.ReactNode }) {
  return <div className={`admin-card ${on ? "is-on" : "is-off"}`}>
    <Link href={href} className="admin-card-link"><small>{label}</small><strong>{title}</strong><span>{detail}</span><em>Open <ArrowUpRight size={15} aria-hidden="true" /></em></Link>
    {children}
  </div>;
}
export default async function SectionsPage() {
  // Any staff member with at least one permission may enter; each card shows only with its permission.
  const { access } = await requireAdminPage();
  const can = (p: Parameters<typeof access.permissions.has>[0]) => access.permissions.has(p);
  const [catalog, services, stories, sections] = await Promise.all([getOwnerCatalog(), getOwnerServices(), getOwnerPulseStories(), getSectionState()]);
  const liveCount = catalog.collections.filter(c => c.status === "published").length + (sections.services ? 1 : 0) + (sections["global-pulse"] ? 1 : 0);
  return <main id="main-content" className="container auth-page admin-hub">
    <h1><Localized en="Products & sections" bn="পণ্য ও সেকশন" /></h1>
    <p><Localized en="Each card is one part of the website. ON = visible to customers, OFF = hidden. Open a card to edit its content." bn="প্রতিটি কার্ড ওয়েবসাইটের একটি অংশ। ON = গ্রাহকরা দেখতে পাবেন, OFF = লুকানো। কনটেন্ট এডিট করতে কার্ড খুলুন।" /></p>
    <p className="admin-live-count"><strong>{liveCount}</strong> section{liveCount === 1 ? "" : "s"} live on the website{access.owner ? " · you are the owner (full access)" : ""}</p>
    {!catalog.ready && <p className="admin-callout">Product sections need the latest database migration. Run <code>npm run db:migrate</code>, then reload.</p>}
    {productPermissions.some(can) && <><h2>Product sections</h2>
    <div className="admin-card-grid">
      {catalog.collections.map(c => <Card key={c.id} href={`/admin/sections/${c.id}`} label={presetLabel[c.preset].en} title={c.nameEn} on={c.status === "published"}
        detail={`${c.publishedCount} published · ${c.productCount} total${c.productCount === 0 && (c.preset === "caps" || c.preset === "tech") ? " · showing placeholders" : c.productCount === 0 ? " · empty sections stay hidden" : ""}`}>
        {can("sections.toggle") ? <SectionSwitch kind="collection" id={c.id} on={c.status === "published"} name={c.nameEn} /> : null}
      </Card>)}
    </div>
    {catalog.ready && can("products.manage") && <CreateCollection />}</>}
    {(can("services.manage") || can("pulse.manage") || can("site.manage")) && <h2>Other sections</h2>}
    <div className="admin-card-grid">
      {(can("services.manage") || can("site.manage")) && <Card href="/admin/services" label="Tech solutions" title="Services" on={sections.services} detail={services.managed ? `${services.services.filter(s => s.status === "published").length} published · ${services.services.length} total` : "No services yet"}>
        {can("site.manage") ? <SectionSwitch kind="site" id="services" on={sections.services} name="Services" /> : null}
      </Card>}
      {(can("pulse.manage") || can("site.manage")) && <Card href="/admin/pulse" label="News strip" title="Global Pulse" on={sections["global-pulse"]} detail={`${stories.length} stor${stories.length === 1 ? "y" : "ies"}`}>
        {can("site.manage") ? <SectionSwitch kind="site" id="global-pulse" on={sections["global-pulse"]} name="Global Pulse" /> : null}
      </Card>}
    </div>
  </main>;
}
