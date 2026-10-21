import type { ReactNode } from "react";
import type { Metadata } from "next";
import { currentSession } from "@/lib/access";
import { getAccess } from "@/lib/rbac";
import { catalogDb } from "@/lib/store-products";
import { storeLive } from "@/lib/seo";
import { adminCounts } from "@/lib/admin-today";
import { menuFor } from "@/lib/admin-menu";
import { AdminShell } from "@/components/admin-shell";
import "./admin.css";

export const dynamic = "force-dynamic";
// Private area: never indexed (robots.txt also disallows /admin).
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Wraps every admin page in the side menu. Each page still checks its own permission (requireAdminPage). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await currentSession().catch(() => null);
  if (!session?.user.emailVerified) return children;
  const db = catalogDb();
  const access = await getAccess(db, session.user.id).catch(() => null);
  if (!access || access.permissions.size === 0) return children;
  const counts = await adminCounts(db, access).catch(() => ({ orders: 0, leads: 0, lowStock: 0 }));
  return <AdminShell menu={menuFor(access, counts)} live={storeLive()} name={session.user.name || session.user.email} role={access.owner ? "Owner · full access" : "Staff"}>{children}</AdminShell>;
}
