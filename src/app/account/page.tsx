import Link from "@/components/locale-link";
import { and, eq } from "drizzle-orm";
import { account, user } from "@/lib/db/schema";
import { SecurityPanel } from "@/components/security-panel";
import { staffTwoFactorRequired } from "@/lib/two-factor-policy";
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
import { DeleteAccount } from "@/components/delete-account";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  const db = catalogDb();
  // Accept a pending staff invite on the first visit after sign-in, so the "Staff workspace" button appears here.
  await claimInvite(db, session.user).catch(() => false);
  const [cred] = await db.select({ id: account.id }).from(account).where(and(eq(account.userId, session.user.id), eq(account.providerId, "credential"))).limit(1);
  const [me] = await db.select({ on: user.twoFactorEnabled }).from(user).where(eq(user.id, session.user.id)).limit(1);
  const security = { hasPassword: Boolean(cred), twoFactorOn: Boolean(me?.on) };
  const [access, orders, profile, requireStaff2fa] = await Promise.all([getAccess(db, session.user.id), listMyOrders(db, session.user.id).catch(() => []), getProfile(db, session.user.id).catch(() => null), staffTwoFactorRequired(db).catch(() => false)]);
  const isStaff = !access.owner && access.permissions.size > 0;
  // Staff who must set up two-step verification always see the card, even without "Security settings".
  const mustSetup = isStaff && requireStaff2fa && security.hasPassword && !security.twoFactorOn;
  return <main id="main-content" className="container auth-page account-page">
    <div className="account-head"><h1><Localized en="Your account" bn="আপনার অ্যাকাউন্ট" /></h1>
      <div className="account-actions">{access.permissions.size > 0 && <Link className="account-btn is-workspace" href="/admin"><ActionIcon name="workspace" />{access.owner ? <Localized en="Owner workspace" bn="Owner workspace" /> : <Localized en="Staff workspace" bn="স্টাফ workspace" />}</Link>}<SignOut /></div></div>
    {profile ? <ProfileForm initial={profile} email={session.user.email} /> : <section className="profile-card"><h2>{session.user.name}</h2><p>{session.user.email}</p></section>}
    <MyOrders orders={orders} />
    {/* Owner always; staff when the owner grants "Security settings" or requires two-step verification. Customers never see it. */}
    {(access.owner || access.permissions.has("account.security") || (isStaff && requireStaff2fa)) && <SecurityPanel hasPassword={security.hasPassword} twoFactorOn={security.twoFactorOn} isStaff mustSetup={mustSetup} enforced={isStaff && requireStaff2fa} owner={access.owner ? { requireStaff2fa } : null} />}
    {!access.owner && access.permissions.size === 0 && <DeleteAccount />}
  </main>;
}
