import { requireAdminPage } from "@/lib/admin-guard";
import { getOwnerServices } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { ServiceDashboard } from "@/components/service-dashboard";
export const dynamic = "force-dynamic";
export default async function ServicesAdminPage() {
  await requireAdminPage("services.manage");
  return <main id="main-content" className="container auth-page"><AdminBack /><h1>Tech solutions · Services</h1><p>Web development, apps, software and other services shown in the “Technology services” row.</p><ServiceDashboard initial={await getOwnerServices()} /></main>;
}
