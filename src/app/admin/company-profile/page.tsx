import { requireAdminPage } from "@/lib/admin-guard";
import { getCompanyProfileFresh } from "@/lib/company-profile";
import { catalogDb } from "@/lib/store-products";
import { CompanyProfileEditor } from "@/components/company-profile-editor";
export const dynamic = "force-dynamic";

export default async function CompanyProfileAdminPage() {
  await requireAdminPage("content.manage");
  const profile = await getCompanyProfileFresh(catalogDb());
  return <main id="main-content" className="container auth-page"><h1>Company profile</h1>
    <p className="small-note">Edit every section of the public company profile (oanro.com/company-profile): texts in English and Bangla, cards, lists, logos and the order of sections. Add new sections, switch any section off, or reset everything to the original version. Changes go live right after you save.</p>
    <CompanyProfileEditor initial={profile} />
  </main>;
}
