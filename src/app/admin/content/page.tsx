import { requireAdminPage } from "@/lib/admin-guard";
import { getSiteContentFresh } from "@/lib/site-content";
import { catalogDb, getOwnerCatalog } from "@/lib/store-products";
import { ContentEditor } from "@/components/content-editor";
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  await requireAdminPage("content.manage");
  const [content, catalog] = await Promise.all([getSiteContentFresh(catalogDb()), getOwnerCatalog()]);
  const sections = Object.fromEntries(catalog.collections.map(c => [c.id, c.nameEn]));
  const products = catalog.products.filter(p => p.status === "published" && p.featuredEligible).map(p => ({ slug: p.slug, name: p.nameEn, section: sections[p.collectionId] ?? "Store" }));
  return <main id="main-content" className="container auth-page"><h1>Website content</h1>
    <p className="small-note">Change the words on the website, switch sections on or off, and edit guides, studio packages and common questions. Changes go live right after you save. &ldquo;Reset to default&rdquo; brings back the original version of that tab.</p>
    <ContentEditor initial={content} products={products} />
  </main>;
}
