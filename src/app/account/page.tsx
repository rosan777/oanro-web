import type { Metadata } from "next";
import Link from "@/components/locale-link";
import { and, eq } from "drizzle-orm";
import {
  ArrowUpRight,
  Heart,
  LifeBuoy,
  MapPin,
  Package,
  Receipt,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
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
import { requestLocale } from "@/lib/request-locale";
import { listAddresses } from "@/lib/address-store";
import { listMyLeads } from "@/lib/lead-store";
import { listClientInvoices, listClientProjects } from "@/lib/workspace-store";
import { formatPrice } from "@/lib/catalog";
import { formatDhaka } from "@/lib/dhaka-time";
import { welcomeLine } from "@/lib/greeting";
import { getSiteConfig } from "@/lib/site-config";
import { SignOut } from "@/components/auth-panel";
import { MyOrders } from "@/components/my-orders";
import { ProfileForm } from "@/components/profile-form";
import { DeleteAccount } from "@/components/delete-account";
import { InquiryForm } from "@/components/inquiry-form";
import { WishlistView } from "@/components/saved-pages";
import { AddressBook, NewsletterToggle, SavedCount } from "@/components/account-panels";
import { LanguageSwitch } from "@/components/locale";
import { projectStatusLabel, invoiceStatusLabel } from "@/lib/workspace-labels";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

const tabs = [
  "overview",
  "orders",
  "projects",
  "wishlist",
  "addresses",
  "invoices",
  "preferences",
  "support",
] as const;
type Tab = (typeof tabs)[number];

/** My account (approved design): one page with tabs, each backed by the customer's own data. */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  const db = catalogDb();
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const requested = (await searchParams).tab;
  const tab: Tab = tabs.includes(requested as Tab) ? (requested as Tab) : "overview";
  const products = getSiteConfig().products;
  // Accept a pending staff invite on the first visit after sign-in, so the "Staff workspace" button appears here.
  await claimInvite(db, session.user).catch(() => false);

  // Security card state: does this person sign in with a password, and is two-step verification on?

  const [cred] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, "credential")))
    .limit(1);
  const [me] = await db
    .select({ on: user.twoFactorEnabled })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const security = { hasPassword: Boolean(cred), twoFactorOn: Boolean(me?.on) };

  // Everything else; each part falls back to empty if the database is slow.

  const [access, orders, profile, requireStaff2fa, addresses, projects, invoices, requests] =
    await Promise.all([
      getAccess(db, session.user.id),
      listMyOrders(db, session.user.id).catch(() => []),
      getProfile(db, session.user.id).catch(() => null),
      staffTwoFactorRequired(db).catch(() => false),
      listAddresses(db, session.user.id).catch(() => []),
      listClientProjects(db, session.user.id).catch(() => []),
      listClientInvoices(db, session.user.id).catch(() => []),
      listMyLeads(db, session.user.id).catch(() => []),
    ]);
  const isStaff = !access.owner && access.permissions.size > 0;
  // Staff who must set up two-step verification always see the card, even without "Security settings".
  const mustSetup = isStaff && requireStaff2fa && security.hasPassword && !security.twoFactorOn;
  const showSecurity =
    access.owner || access.permissions.has("account.security") || (isStaff && requireStaff2fa);
  const firstName = (profile?.name || session.user.name || "").split(" ")[0];
  const menu: [Tab, string, typeof UserRound][] = [
    ["overview", t("Overview", "সারসংক্ষেপ"), UserRound],
    ["orders", t("Orders", "অর্ডার"), Package],
    ["projects", t("Projects", "প্রজেক্ট"), Sparkles],
    ...(products
      ? ([["wishlist", t("Wishlist", "পছন্দের তালিকা"), Heart]] as [
          Tab,
          string,
          typeof UserRound,
        ][])
      : []),
    ["addresses", t("Addresses", "ঠিকানা"), MapPin],
    ["invoices", t("Receipts & invoices", "রসিদ ও ইনভয়েস"), Receipt],
    ["preferences", t("Preferences", "পছন্দ ও সেটিংস"), Settings],
    ["support", t("Support", "সহায়তা"), LifeBuoy],
  ];
  const statusText = (s: string) =>
    ({
      new: t("Received", "পেয়েছি"),
      contacted: t("We replied", "উত্তর দিয়েছি"),
      qualified: t("In discussion", "আলোচনা চলছে"),
      won: t("Agreed", "সম্মত"),
      lost: t("Closed", "বন্ধ"),
      closed: t("Closed", "বন্ধ"),
    })[s] ?? s;
  return (
    <main id="main-content" className="o-section account-page">
      <div className="o-account-layout">
        <aside className="o-account-menu">
          <div className="o-account-person">
            <span className="o-avatar" aria-hidden="true">
              {(firstName || session.user.email).charAt(0).toUpperCase()}
            </span>
            <div>
              <b>{profile?.name || session.user.name}</b>
              <small>{session.user.email}</small>
            </div>
          </div>
          <nav aria-label={t("Account sections", "অ্যাকাউন্টের অংশ")}>
            {menu.map(([id, label, Icon]) => (
              <Link
                key={id}
                href={id === "overview" ? "/account" : `/account?tab=${id}`}
                className={tab === id ? "active" : ""}
                aria-current={tab === id ? "page" : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="o-account-actions account-actions">
            {access.permissions.size > 0 && (
              <Link className="account-btn is-workspace" href="/admin">
                <ActionIcon name="workspace" />
                {access.owner
                  ? t("Owner workspace", "Owner workspace")
                  : t("Staff workspace", "স্টাফ workspace")}
              </Link>
            )}
            <SignOut />
          </div>
        </aside>

        <div className="o-account-main">
          {tab === "overview" && (
            <>
              <div className="o-account-welcome">
                <span className="o-eyebrow">{t("YOUR OANRO", "আপনার OANRO")}</span>
                <h1>
                  {firstName
                    ? welcomeLine(firstName, locale)
                    : t("Everything, a little simpler.", "সব কিছু, একটু সহজে।")}
                </h1>
                <p>
                  {t(
                    "Your orders, projects and saved things in one place.",
                    "আপনার অর্ডার, প্রজেক্ট ও রাখা জিনিস এক জায়গায়।",
                  )}
                </p>
              </div>
              <div className="o-metrics">
                <Link href="/account?tab=orders">
                  <span>{t("Orders", "অর্ডার")}</span>
                  <strong>{orders.length}</strong>
                  <small>
                    {orders[0] ? `${orders[0].code}` : t("No orders yet", "এখনো অর্ডার নেই")}
                  </small>
                </Link>
                <Link href="/account?tab=projects">
                  <span>{t("Projects", "প্রজেক্ট")}</span>
                  <strong>{projects.length}</strong>
                  <small>
                    {projects[0]?.title ?? t("Start with a brief", "একটি ব্রিফ দিয়ে শুরু করুন")}
                  </small>
                </Link>
                {products && (
                  <Link href="/account?tab=wishlist">
                    <span>{t("Saved favourites", "পছন্দের তালিকা")}</span>
                    <strong>
                      <SavedCount />
                    </strong>
                    <small>{t("On this device and your account", "এই ডিভাইস ও অ্যাকাউন্টে")}</small>
                  </Link>
                )}
                <Link href="/account?tab=support">
                  <span>{t("Requests", "অনুরোধ")}</span>
                  <strong>{requests.length}</strong>
                  <small>
                    {requests[0]
                      ? statusText(requests[0].status)
                      : t("Ask us anything", "যেকোনো প্রশ্ন করুন")}
                  </small>
                </Link>
              </div>
              {orders.length > 0 && <MyOrders orders={orders.slice(0, 1)} />}
              <div className="o-quick-links">
                <Link href="/track">
                  {t("Track an order", "অর্ডার ট্র্যাক করুন")}{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
                {products && (
                  <Link href="/shop">
                    {t("Shop the collection", "কালেকশন দেখুন")}{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                )}
                <Link href="/workspace">
                  {t("Open the workspace", "ওয়ার্কস্পেস খুলুন")}{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </>
          )}

          {tab === "orders" && (
            <>
              <h1>{t("Orders", "অর্ডার")}</h1>
              <MyOrders orders={orders} />
            </>
          )}

          {tab === "projects" && (
            <div className="o-panel">
              <h1>{t("Projects", "প্রজেক্ট")}</h1>
              {projects.length ? (
                <ul className="o-row-list">
                  {projects.map(p => (
                    <li key={p.id}>
                      <div>
                        <b>{p.title}</b>
                        <small>
                          {projectStatusLabel(p.status, bn)}
                          {p.targetDate ? ` · ${t("Target", "লক্ষ্য")} ${p.targetDate}` : ""}
                        </small>
                      </div>
                      <Link className="o-button secondary" href={`/workspace/${p.id}`}>
                        {t("Open workspace", "ওয়ার্কস্পেস খুলুন")}{" "}
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="o-empty o-empty-small">
                  <h3>{t("No projects yet.", "এখনো কোনো প্রজেক্ট নেই।")}</h3>
                  <p>
                    {t(
                      "When OANRO Studio starts work with you, your project appears here.",
                      "OANRO স্টুডিও আপনার সাথে কাজ শুরু করলে প্রজেক্টটি এখানে দেখাবে।",
                    )}
                  </p>
                  <Link className="o-button" href="/contact">
                    {t("Start a new brief", "নতুন ব্রিফ দিন")}{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {tab === "wishlist" && products && <WishlistView signedIn />}

          {tab === "addresses" && <AddressBook initial={addresses} />}

          {tab === "invoices" && (
            <div className="o-panel">
              <h1>{t("Receipts & invoices", "রসিদ ও ইনভয়েস")}</h1>
              <h2>{t("Order receipts", "অর্ডারের রসিদ")}</h2>
              {orders.length ? (
                <ul className="o-row-list">
                  {orders.map(o => (
                    <li key={o.id}>
                      <div>
                        <b>{o.code}</b>
                        <small>
                          {formatDhaka(o.createdAt, locale)} · {formatPrice(o.total, locale)}
                        </small>
                      </div>
                      <Link className="o-button secondary" href={`/account/orders/${o.id}/receipt`}>
                        {t("View receipt", "রসিদ দেখুন")}{" "}
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="o-muted">{t("No orders yet.", "এখনো কোনো অর্ডার নেই।")}</p>
              )}
              <h2>{t("Project invoices", "প্রজেক্ট ইনভয়েস")}</h2>
              {invoices.length ? (
                <ul className="o-row-list">
                  {invoices.map(i => (
                    <li key={i.id}>
                      <div>
                        <b>{i.number}</b>
                        <small>
                          {invoiceStatusLabel(i.status, bn)} · {formatPrice(i.total, locale)}
                          {i.dueDate ? ` · ${t("Due", "শেষ তারিখ")} ${i.dueDate}` : ""}
                        </small>
                      </div>
                      <Link
                        className="o-button secondary"
                        href={`/workspace/${i.projectId}?tab=invoices`}
                      >
                        {t("Open", "খুলুন")} <ArrowUpRight size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="o-muted">{t("No project invoices.", "কোনো প্রজেক্ট ইনভয়েস নেই।")}</p>
              )}
            </div>
          )}

          {tab === "preferences" && (
            <>
              <h1>{t("Preferences", "পছন্দ ও সেটিংস")}</h1>
              {profile ? (
                <ProfileForm initial={profile} email={session.user.email} />
              ) : (
                <section className="profile-card">
                  <h2>{session.user.name}</h2>
                  <p>{session.user.email}</p>
                </section>
              )}
              <div className="o-panel o-preferences">
                <h2>{t("Language", "ভাষা")}</h2>
                <p className="o-muted">
                  {t("Choose the language you see OANRO in.", "OANRO কোন ভাষায় দেখবেন বেছে নিন।")}
                </p>
                <LanguageSwitch />
                <h2>{t("Email", "ইমেইল")}</h2>
                <NewsletterToggle />
              </div>
              {/* Owner always; staff when the owner grants "Security settings" or requires two-step verification. Customers never see it. */}
              {showSecurity && (
                <SecurityPanel
                  hasPassword={security.hasPassword}
                  twoFactorOn={security.twoFactorOn}
                  isStaff
                  mustSetup={mustSetup}
                  enforced={isStaff && requireStaff2fa}
                  owner={access.owner ? { requireStaff2fa } : null}
                />
              )}
              {!access.owner && access.permissions.size === 0 && <DeleteAccount />}
            </>
          )}

          {tab === "support" && (
            <div className="o-panel">
              <h1>{t("Support", "সহায়তা")}</h1>
              <p className="o-muted">
                {t(
                  "Questions about an order, a payment or a project? Send us a message; a real person replies.",
                  "অর্ডার, পেমেন্ট বা প্রজেক্ট নিয়ে প্রশ্ন? বার্তা পাঠান; একজন মানুষ উত্তর দেবেন।",
                )}
              </p>
              {requests.length > 0 && (
                <>
                  <h2>{t("Your requests", "আপনার অনুরোধ")}</h2>
                  <ul className="o-row-list">
                    {requests.map(r => (
                      <li key={r.id}>
                        <div>
                          <b>{r.subject || r.message.slice(0, 60) || t("Message", "বার্তা")}</b>
                          <small>{formatDhaka(r.createdAt.toISOString(), locale)}</small>
                        </div>
                        <span className="o-status">{statusText(r.status)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h2>{t("Send a message", "বার্তা পাঠান")}</h2>
              <InquiryForm
                kind="general"
                prefill={{ name: profile?.name || session.user.name, email: session.user.email }}
              />
            </div>
          )}
        </div>
      </div>
      {/* Staff who must set up two-step verification see the card on every tab. */}
      {mustSetup && tab !== "preferences" && (
        <SecurityPanel
          hasPassword={security.hasPassword}
          twoFactorOn={security.twoFactorOn}
          isStaff
          mustSetup={mustSetup}
          enforced
          owner={null}
        />
      )}
    </main>
  );
}
