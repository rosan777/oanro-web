import { Localized } from "@/components/locale";
import { requireAdminPage } from "@/lib/admin-guard";
import { assignableUsers, listLeads } from "@/lib/lead-store";
import { getReplySignoff } from "@/lib/lead-reply";
import { catalogDb } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { LeadInbox } from "@/components/lead-inbox";
export const dynamic = "force-dynamic";

/** Inquiry inbox. A missing table (migration not run) shows a notice instead of an error. */
export default async function LeadsPage() {
  const { access } = await requireAdminPage("leads.read");
  let data: {
    leads: Awaited<ReturnType<typeof listLeads>>;
    people: { id: string; name: string }[];
    signoff: string;
  } | null = null;
  try {
    const db = catalogDb();
    data = {
      leads: await listLeads(db),
      people: await assignableUsers(db),
      signoff: await getReplySignoff(db),
    };
  } catch {
    data = null;
  }
  return (
    <main id="main-content" className="container auth-page">
      <AdminBack />
      <h1>
        <Localized en="Customer inquiries" bn="গ্রাহকের ইনকোয়ারি" />
      </h1>
      <p>
        <Localized
          en="Messages from the product pages and the contact form. Contact details are personal data: use them only to reply."
          bn="পণ্যের পেজ ও যোগাযোগ ফর্ম থেকে আসা বার্তা। যোগাযোগের তথ্য ব্যক্তিগত: শুধু উত্তর দিতে ব্যবহার করুন।"
        />
      </p>
      {data ? (
        <LeadInbox
          initial={data.leads}
          people={data.people}
          signoff={data.signoff}
          canManage={access.permissions.has("leads.manage")}
          canProject={access.permissions.has("projects.manage")}
        />
      ) : (
        <p className="admin-callout">
          Inquiries need the latest database migration. Run <code>npm run db:migrate</code>, then
          reload.
        </p>
      )}
    </main>
  );
}
