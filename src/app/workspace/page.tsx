import type { Metadata } from "next";
import { ArrowUpRight, Check } from "lucide-react";
import Link from "@/components/locale-link";
import { currentSession } from "@/lib/access";
import { getAccess } from "@/lib/rbac";
import { catalogDb } from "@/lib/store-products";
import { requestLocale } from "@/lib/request-locale";
import { listClientProjects } from "@/lib/workspace-store";
import { projectStatusLabel, projectTypeLabel } from "@/lib/workspace-labels";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Client workspace",
  description:
    "Follow your OANRO Studio project: milestones, files, approvals and invoices in one place.",
  robots: { index: false, follow: true },
};

/** Workspace home: what it is for visitors, the client's projects once signed in. */
export default async function WorkspaceHome() {
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const session = await currentSession().catch(() => null);
  const db = catalogDb();
  const [projects, access] = session
    ? await Promise.all([
        listClientProjects(db, session.user.id).catch(() => []),
        getAccess(db, session.user.id),
      ])
    : [[], null];
  const staff =
    access &&
    (access.owner ||
      ["projects.read", "projects.manage", "projects.invoices"].some(p =>
        access.permissions.has(p as never),
      ));
  return (
    <main id="main-content" className="o-section o-tech-page">
      <div className="o-section-line">
        <div className="o-title">
          <span className="o-eyebrow">{t("CLIENT WORKSPACE", "ক্লায়েন্ট ওয়ার্কস্পেস")}</span>
          <h1>{t("Your next chapter, in one place.", "আপনার নতুন অধ্যায়, এক জায়গায়।")}</h1>
          <p>
            {t(
              "For OANRO Studio clients: follow milestones, share files, approve work and see invoices for your project.",
              "OANRO স্টুডিওর ক্লায়েন্টদের জন্য: মাইলস্টোন দেখুন, ফাইল দিন, কাজ অনুমোদন করুন আর প্রজেক্টের ইনভয়েস দেখুন।",
            )}
          </p>
        </div>
        <Link className="o-button" href="/contact">
          {t("Start a new brief", "নতুন ব্রিফ দিন")} <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
      {!session ? (
        <div className="o-workspace-intro">
          <ul>
            {[
              t(
                "Milestones and progress, always up to date",
                "মাইলস্টোন ও অগ্রগতি, সবসময় হালনাগাদ",
              ),
              t("Files shared safely with the team", "টিমের সাথে নিরাপদে ফাইল শেয়ার"),
              t("Approve designs or ask for changes", "ডিজাইন অনুমোদন বা পরিবর্তনের অনুরোধ"),
              t("Invoices and payment status", "ইনভয়েস ও পেমেন্টের অবস্থা"),
            ].map(x => (
              <li key={x}>
                <Check size={17} aria-hidden="true" /> {x}
              </li>
            ))}
          </ul>
          <p className="o-muted">
            {t(
              "Access is by invitation: when we start your project, we email you a link.",
              "প্রবেশ আমন্ত্রণের মাধ্যমে: আপনার প্রজেক্ট শুরু হলে আমরা ইমেইলে লিংক পাঠাই।",
            )}
          </p>
          <Link className="o-button secondary" href="/sign-in?next=/workspace">
            {t("Sign in to your workspace", "ওয়ার্কস্পেসে সাইন ইন")}{" "}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      ) : projects.length ? (
        <div className="o-project-cards">
          {projects.map(p => (
            <Link key={p.id} href={`/workspace/${p.id}`} className="o-project-card">
              <small>{projectTypeLabel(p.projectType, bn)}</small>
              <h2>{p.title}</h2>
              <span className="o-status">{projectStatusLabel(p.status, bn)}</span>
              {p.targetDate && (
                <small>
                  {t("Target", "লক্ষ্য")} {p.targetDate}
                </small>
              )}
              <ArrowUpRight size={22} aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="o-empty">
          <h2>{t("No projects yet.", "এখনো কোনো প্রজেক্ট নেই।")}</h2>
          <p>
            {t(
              "When OANRO Studio starts work with you, your project appears here. Have an invitation email? Open its link.",
              "OANRO স্টুডিও আপনার সাথে কাজ শুরু করলে প্রজেক্টটি এখানে দেখাবে। আমন্ত্রণ ইমেইল পেয়েছেন? লিংকটি খুলুন।",
            )}
          </p>
        </div>
      )}
      {staff && (
        <p className="o-muted">
          <Link className="o-underlined" href="/admin/projects">
            {t(
              "Manage all client projects in admin",
              "অ্যাডমিনে সব ক্লায়েন্ট প্রজেক্ট পরিচালনা করুন",
            )}
          </Link>
        </p>
      )}
    </main>
  );
}
