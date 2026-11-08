import { Localized } from "@/components/locale";
import { requireAdminPage } from "@/lib/admin-guard";
import { getOwnerServices } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { ServiceDashboard } from "@/components/service-dashboard";
export const dynamic = "force-dynamic";
export default async function ServicesAdminPage() {
  await requireAdminPage("services.manage");
  return (
    <main id="main-content" className="container auth-page">
      <AdminBack />
      <h1>
        <Localized en="Tech solutions · Services" bn="টেক সলিউশন · সেবা" />
      </h1>
      <p>
        <Localized
          en="Web development, apps, software and other services shown in the “Technology services” row."
          bn="“প্রযুক্তি সেবা” সারিতে দেখানো ওয়েব ডেভেলপমেন্ট, অ্যাপ, সফটওয়্যার ও অন্যান্য সেবা।"
        />
      </p>
      <ServiceDashboard initial={await getOwnerServices()} />
    </main>
  );
}
