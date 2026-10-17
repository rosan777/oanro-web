import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-guard";
import { canProduct, productPermissions } from "@/lib/permissions";
import { catalogDb, getOwnerCatalog } from "@/lib/store-products";
import { listProductCosts } from "@/lib/report-store";
import { AdminBack } from "@/components/admin-nav";
import { CollectionSettings } from "@/components/collection-admin";
import { ProductDashboard } from "@/components/product-dashboard";
export const dynamic = "force-dynamic";
export default async function SectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { access } = await requireAdminPage(productPermissions);
  const has = (x: Parameters<typeof access.permissions.has>[0]) => access.permissions.has(x);
  const rights = { manage: canProduct(has, "manage"), draft: canProduct(has, "draft"), publish: canProduct(has, "publish"), hide: canProduct(has, "hide") };
  const { id } = await params;
  const [catalog, costs] = await Promise.all([getOwnerCatalog(), access.permissions.has("costs.manage") ? listProductCosts(catalogDb()).catch(() => null) : null]);
  const section = catalog.collections.find(c => c.id === id);
  if (!section) notFound();
  return <main id="main-content" className="container auth-page"><AdminBack /><h1>{section.nameEn}</h1>
    {rights.manage && <CollectionSettings section={section} />}
    <ProductDashboard initial={catalog} collectionId={section.id} costs={costs} rights={rights} />
  </main>;
}
