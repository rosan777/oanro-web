import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-guard";
import { catalogDb } from "@/lib/store-products";
import { getProject } from "@/lib/workspace-store";
import { storageAvailable } from "@/lib/file-storage";
import Link from "@/components/locale-link";
import { ProjectManager } from "@/components/project-admin";
export const dynamic = "force-dynamic";

/** One client project for staff. The visible actions follow the viewer's project permissions. */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, access } = await requireAdminPage([
    "projects.read",
    "projects.manage",
    "projects.invoices",
  ]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getProject(catalogDb(), id, session.user.id, access).catch(() => null);
  if (!data) notFound();
  return (
    <main id="main-content" className="container auth-page">
      <Link className="back-link" href="/admin/projects">
        ← Client projects / ক্লায়েন্ট প্রজেক্ট
      </Link>
      <h1>{data.project.title}</h1>
      <p>
        <Link href={`/workspace/${id}`}>See what the client sees / ক্লায়েন্টের ভিউ দেখুন →</Link>
      </p>
      <ProjectManager data={JSON.parse(JSON.stringify(data))} uploads={storageAvailable()} />
    </main>
  );
}
