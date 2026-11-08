import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "@/lib/access";
import { getAccess } from "@/lib/rbac";
import { catalogDb } from "@/lib/store-products";
import { getProject } from "@/lib/workspace-store";
import { getPaymentNumbers } from "@/lib/order-store";
import { storageAvailable } from "@/lib/file-storage";
import { WorkspaceView, type WorkspaceData } from "@/components/workspace-view";
import { needsTwoFactorSetup } from "@/lib/two-factor-policy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Project workspace",
  robots: { index: false, follow: false },
};

/** One project for its client members and project staff; anyone else gets a 404. */
export default async function WorkspaceProject({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const session = await currentSession();
  if (!session) redirect(`/sign-in?next=/workspace/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = catalogDb();
  let access = await getAccess(db, session.user.id);
  if (
    (access.owner || access.permissions.size) &&
    (await needsTwoFactorSetup(db, session.user.id, access.owner))
  )
    access = { owner: false, permissions: new Set() };
  const data = await getProject(db, id, session.user.id, access).catch(() => null);
  if (!data) notFound();
  const payTo = await getPaymentNumbers(db).catch(() => ({ bkash: "", nagad: "" }));
  return (
    <main id="main-content" className="o-section o-tech-page">
      <WorkspaceView
        data={JSON.parse(JSON.stringify(data)) as WorkspaceData}
        initialTab={(await searchParams).tab ?? "overview"}
        payTo={payTo}
        uploads={storageAvailable()}
      />
    </main>
  );
}
