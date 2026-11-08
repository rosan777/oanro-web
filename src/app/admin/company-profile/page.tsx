import { Localized } from "@/components/locale";
import { requireAdminPage } from "@/lib/admin-guard";
import { getCompanyProfileFresh } from "@/lib/company-profile";
import { catalogDb } from "@/lib/store-products";
import { CompanyProfileEditor } from "@/components/company-profile-editor";
export const dynamic = "force-dynamic";

export default async function CompanyProfileAdminPage() {
  await requireAdminPage("content.manage");
  const profile = await getCompanyProfileFresh(catalogDb());
  return (
    <main id="main-content" className="container auth-page">
      <h1>
        <Localized en="Company profile" bn="কোম্পানি প্রোফাইল" />
      </h1>
      <p className="small-note">
        <Localized
          en="Edit every section of the public company profile (oanro.com/company-profile): texts in English and Bangla, cards, lists, logos and the order of sections. Add new sections, switch any section off, or reset everything to the original version. Changes go live right after you save."
          bn="পাবলিক কোম্পানি প্রোফাইলের (oanro.com/company-profile) প্রতিটি সেকশন এডিট করুন: ইংরেজি ও বাংলা লেখা, কার্ড, তালিকা, লোগো ও সেকশনের ক্রম। নতুন সেকশন যোগ করুন, যেকোনো সেকশন বন্ধ করুন বা সবকিছু মূল সংস্করণে ফেরান। সংরক্ষণের সাথে সাথেই পরিবর্তন লাইভ হয়।"
        />
      </p>
      <CompanyProfileEditor initial={profile} />
    </main>
  );
}
