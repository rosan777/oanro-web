import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-guard";
import { getOwnerCatalog } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { CollectionSettings } from "@/components/collection-admin";
import { ProductDashboard } from "@/components/product-dashboard";
export const dynamic = "force-dynamic";
export default async function SectionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("products.manage");
  const { id } = await params;
  const catalog = await getOwnerCatalog();
  const section = catalog.collections.find(c => c.id === id);
  if (!section) notFound();
  return <main id="main-content" className="container auth-page"><AdminBack /><h1>{section.nameEn}</h1>
    <CollectionSettings section={section} />
    <ProductDashboard initial={catalog} collectionId={section.id} />
  </main>;
}
