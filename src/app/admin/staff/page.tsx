import { requireAdminPage } from "@/lib/admin-guard";
import { getStaffOverview } from "@/lib/rbac";
import { catalogDb } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { StaffDashboard } from "@/components/staff-dashboard";
export const dynamic = "force-dynamic";
export default async function StaffPage() {
  const { session, access } = await requireAdminPage("staff.manage");
  return <main id="main-content" className="container auth-page"><AdminBack /><h1>Staff & roles</h1><StaffDashboard initial={await getStaffOverview(catalogDb())} selfId={session.user.id} isOwner={access.owner} /></main>;
}
