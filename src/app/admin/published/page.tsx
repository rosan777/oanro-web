import { Localized } from "@/components/locale";
import { requireAdminPage } from "@/lib/admin-guard";
import { canProduct, productPermissions } from "@/lib/permissions";
import { getOwnerCatalog } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { PublishedProducts } from "@/components/published-products";
export const dynamic = "force-dynamic";

/** Every live (published) product in one numbered list, with quick stock editing. */
export default async function PublishedPage() {
  const { access } = await requireAdminPage(productPermissions);
  const canStock = canProduct(x => access.permissions.has(x), "manage");
  const catalog = await getOwnerCatalog();
  const sections = Object.fromEntries(catalog.collections.map(c => [c.id, c.nameEn]));
  const rows = catalog.products
    .filter(p => p.status === "published")
    .map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.nameEn,
      section: sections[p.collectionId] ?? "—",
      sectionId: p.collectionId,
      price: p.price,
      stock: p.stock,
      lowStockAt: p.lowStockAt,
      perVariant: Boolean(p.variants?.length),
      hasImage: p.hasImage,
      updatedAt: p.updatedAt,
    }));
  return (
    <main id="main-content" className="container auth-page">
      <AdminBack />
      <h1>
        <Localized en="Published products" bn="প্রকাশিত পণ্য" />
      </h1>
      <p className="small-note">
        <Localized
          en="Everything customers can see in the store right now, in one list. Change stock here; edit the full product inside its section."
          bn="এই মুহূর্তে স্টোরে গ্রাহকরা যা দেখতে পান, এক তালিকায়। স্টক এখানে বদলান; পুরো পণ্য তার সেকশনের ভেতরে এডিট করুন।"
        />
      </p>
      <PublishedProducts initial={rows} canStock={canStock} />
    </main>
  );
}
