import { requireAdminPage } from "@/lib/admin-guard";
import { getOwnerCampaigns, getOwnerCatalog } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { CampaignDashboard } from "@/components/campaign-dashboard";
export const dynamic = "force-dynamic";
export default async function CampaignsPage() {
  await requireAdminPage("campaigns.manage");
  const [{ ready, campaigns }, catalog] = await Promise.all([getOwnerCampaigns(), getOwnerCatalog()]);
  const sectionName = (id: string) => catalog.collections.find(c => c.id === id)?.nameEn ?? id;
  return <main id="main-content" className="container auth-page"><AdminBack /><h1>Seasonal campaigns</h1>
    {ready ? <CampaignDashboard initial={campaigns} products={catalog.products.map(p => ({ id: p.id, name: p.nameEn, section: sectionName(p.collectionId), status: p.status }))} />
      : <p className="admin-callout">Campaigns need the latest database migration. Run <code>npm run db:migrate</code>, then reload.</p>}
  </main>;
}
