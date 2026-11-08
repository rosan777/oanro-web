import { requireAdminPage } from "@/lib/admin-guard";
import { catalogDb } from "@/lib/store-products";
import { listAllProjects } from "@/lib/workspace-store";
import { requestLocale } from "@/lib/request-locale";
import { AdminBack } from "@/components/admin-nav";
import { ProjectList } from "@/components/project-admin";
export const dynamic = "force-dynamic";

/** Client projects (Workspace). Any project permission opens the list; creating needs projects.manage. */
export default async function ProjectsPage() {
  const { access } = await requireAdminPage([
    "projects.read",
    "projects.manage",
    "projects.invoices",
  ]);
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const projects = await listAllProjects(catalogDb()).catch(() => null);
  return (
    <main id="main-content" className="container auth-page">
      <AdminBack />
      <h1>{bn ? "ক্লায়েন্ট প্রজেক্ট" : "Client projects"}</h1>
      <p>
        {bn
          ? "স্টুডিওর প্রজেক্ট: মাইলস্টোন, ফাইল, অনুমোদন ও ইনভয়েস। ক্লায়েন্ট শুধু আমন্ত্রণ পাওয়া প্রজেক্ট দেখেন।"
          : "Studio projects: milestones, files, approvals and invoices. Clients see only the projects they are invited to."}
      </p>
      {projects ? (
        <ProjectList
          projects={JSON.parse(JSON.stringify(projects))}
          canManage={access.owner || access.permissions.has("projects.manage")}
        />
      ) : (
        <p className="admin-callout">
          {bn
            ? "প্রজেক্টের জন্য সর্বশেষ ডেটাবেস মাইগ্রেশন দরকার।"
            : "Projects need the latest database migration."}
        </p>
      )}
    </main>
  );
}
