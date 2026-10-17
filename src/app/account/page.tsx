import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/access";
import { claimInvite, getAccess } from "@/lib/rbac";
import { listMyOrders } from "@/lib/order-store";
import { getProfile } from "@/lib/profile-store";
import { catalogDb } from "@/lib/store-products";
import { SignOut } from "@/components/auth-panel";
import { Localized } from "@/components/locale";
import { MyOrders } from "@/components/my-orders";
import { ProfileForm } from "@/components/profile-form";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  const db = catalogDb();
  // Accept a pending staff invite on the first visit after sign-in, so the "Staff workspace" button appears here.
  await claimInvite(db, session.user).catch(() => false);
  const [access, orders, profile] = await Promise.all([getAccess(db, session.user.id), listMyOrders(db, session.user.id).catch(() => []), getProfile(db, session.user.id).catch(() => null)]);
  return <main id="main-content" className="container auth-page account-page">
    <div className="account-head"><h1><Localized en="Your account" bn="আপনার অ্যাকাউন্ট" /></h1>
      <div className="account-actions">{access.permissions.size > 0 && <Link className="account-btn is-workspace" href="/admin"><ActionIcon name="workspace" />{access.owner ? <Localized en="Owner workspace" bn="Owner workspace" /> : <Localized en="Staff workspace" bn="স্টাফ workspace" />}</Link>}<SignOut /></div></div>
    {profile ? <ProfileForm initial={profile} email={session.user.email} /> : <section className="profile-card"><h2>{session.user.name}</h2><p>{session.user.email}</p></section>}
    <MyOrders orders={orders} />
  </main>;
}
