import { notFound, redirect } from "next/navigation";
import { currentSession, isOwner } from "@/lib/access";
import { Localized } from "@/components/locale";
import { SectionDashboard } from "@/components/section-dashboard";
import { getSectionState, getOwnerPulseStories } from "@/lib/website-sections";
export default async function AdminPage() {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  if (!session.user.emailVerified || !await isOwner(session.user.id)) notFound();
  const [sections, stories] = await Promise.all([getSectionState(), getOwnerPulseStories()]);
  return <main id="main-content" className="container auth-page"><h1><Localized en="Owner workspace" bn="Owner workspace" /></h1><p><Localized en="Staff permissions and payment review are coming in subsequent modules." bn="Staff permissions ও payment review পরবর্তী module-এ যুক্ত হবে।" /></p><SectionDashboard initial={sections} initialStories={stories} /></main>;
}
