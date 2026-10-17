import { requireAdminPage } from "@/lib/admin-guard";
import { assignableUsers, listLeads } from "@/lib/lead-store";
import { catalogDb } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { LeadInbox } from "@/components/lead-inbox";
export const dynamic = "force-dynamic";
export default async function LeadsPage() {
  const { access } = await requireAdminPage("leads.read");
  let data: { leads: Awaited<ReturnType<typeof listLeads>>; people: { id: string; name: string }[] } | null = null;
  try { const db = catalogDb(); data = { leads: await listLeads(db), people: await assignableUsers(db) }; } catch { data = null; }
  return <main id="main-content" className="container auth-page"><AdminBack /><h1>Customer inquiries</h1>
    <p>Messages from the product pages and the contact form. Contact details are personal data: use them only to reply.</p>
    {data ? <LeadInbox initial={data.leads} people={data.people} canManage={access.permissions.has("leads.manage")} /> : <p className="admin-callout">Inquiries need the latest database migration. Run <code>npm run db:migrate</code>, then reload.</p>}
  </main>;
}
