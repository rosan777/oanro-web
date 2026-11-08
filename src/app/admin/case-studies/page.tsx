import { requireAdminPage } from "@/lib/admin-guard";
import { catalogDb } from "@/lib/store-products";
import { listAllCaseStudies } from "@/lib/case-study-store";
import { requestLocale } from "@/lib/request-locale";
import { AdminBack } from "@/components/admin-nav";
import { CaseStudyAdmin } from "@/components/case-study-admin";
export const dynamic = "force-dynamic";

/** Studio case studies (portfolio), with the existing "Website content" permission. */
export default async function CaseStudiesPage() {
  await requireAdminPage("content.manage");
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const rows = await listAllCaseStudies(catalogDb()).catch(() => null);
  return (
    <main id="main-content" className="container auth-page">
      <AdminBack />
      <h1>{bn ? "কেস স্টাডি (পোর্টফোলিও)" : "Case studies (portfolio)"}</h1>
      <p>
        {bn
          ? "স্টুডিও পেজে দেখানো কাজের উদাহরণ। শুধু যাচাই করা তথ্য লিখুন এবং ক্লায়েন্টের অনুমতি ছাড়া নাম দেখাবেন না।"
          : "Examples of Studio work shown on the Studio page. Write verified facts only, and never show a client's name without their permission."}
      </p>
      {rows ? (
        <CaseStudyAdmin initial={JSON.parse(JSON.stringify(rows))} />
      ) : (
        <p className="admin-callout">
          {bn
            ? "সর্বশেষ ডেটাবেস মাইগ্রেশন দরকার।"
            : "Case studies need the latest database migration."}
        </p>
      )}
    </main>
  );
}
