import { requireOwnerPage } from "@/lib/admin-guard";
import { getOwnerPulseStories, getSectionState } from "@/lib/website-sections";
import { AdminBack } from "@/components/admin-nav";
import { SectionDashboard } from "@/components/section-dashboard";
export const dynamic = "force-dynamic";
export default async function PulseAdminPage() {
  await requireOwnerPage();
  const [sections, stories] = await Promise.all([getSectionState(), getOwnerPulseStories()]);
  return <main id="main-content" className="container auth-page"><AdminBack /><h1>Global Pulse</h1><SectionDashboard initial={sections} initialStories={stories} /></main>;
}
