import { Localized } from "@/components/locale";
import { requireAdminPage } from "@/lib/admin-guard";
import { getSiteContentFresh } from "@/lib/site-content";
import { catalogDb, getOwnerCatalog } from "@/lib/store-products";
import { ContentEditor } from "@/components/content-editor";
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  await requireAdminPage("content.manage");
  const [content, catalog] = await Promise.all([
    getSiteContentFresh(catalogDb()),
    getOwnerCatalog(),
  ]);

  // Published products marked as eligible for the featured story, for the "featured product" picker.

  const sections = Object.fromEntries(catalog.collections.map(c => [c.id, c.nameEn]));
  const products = catalog.products
    .filter(p => p.status === "published" && p.featuredEligible)
    .map(p => ({ slug: p.slug, name: p.nameEn, section: sections[p.collectionId] ?? "Store" }));
  return (
    <main id="main-content" className="container auth-page">
      <h1>
        <Localized en="Website content" bn="ওয়েবসাইটের কনটেন্ট" />
      </h1>
      <p className="small-note">
        <Localized
          en="Change the words on the website, switch sections on or off, and edit guides, studio packages and common questions. Changes go live right after you save. “Reset to default” brings back the original version of that tab."
          bn="ওয়েবসাইটের লেখা বদলান, সেকশন চালু বা বন্ধ করুন, আর গাইড, স্টুডিও প্যাকেজ ও সাধারণ প্রশ্ন এডিট করুন। সংরক্ষণের সাথে সাথেই পরিবর্তন লাইভ হয়। “ডিফল্টে ফেরান” সেই ট্যাবের মূল সংস্করণ ফিরিয়ে আনে।"
        />
      </p>
      <ContentEditor initial={content} products={products} />
    </main>
  );
}
