import type { Metadata } from "next";
import { currentSession } from "@/lib/access";
import { requestLocale } from "@/lib/request-locale";
import { AcceptInvite } from "@/components/workspace-accept";
import Link from "@/components/locale-link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Join your project",
  robots: { index: false, follow: false },
};

/** Landing page of the invitation email: sign in with the invited address, then accept. */
export default async function AcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = String((await searchParams).token ?? "").slice(0, 100);
  const session = await currentSession().catch(() => null);
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const next = `/workspace/accept?token=${encodeURIComponent(token)}`;
  return (
    <main id="main-content" className="o-section">
      <div className="o-empty">
        <h1>{bn ? "আপনার প্রজেক্টে যোগ দিন" : "Join your project workspace"}</h1>
        {!token ? (
          <p>
            {bn
              ? "আমন্ত্রণ লিংকটি সম্পূর্ণ নয়। ইমেইলের লিংকটি আবার খুলুন।"
              : "This invitation link is incomplete. Open the link from the email again."}
          </p>
        ) : !session ? (
          <>
            <p>
              {bn
                ? "যে ইমেইলে আমন্ত্রণ পেয়েছেন সেটি দিয়ে সাইন ইন করুন বা অ্যাকাউন্ট খুলুন।"
                : "Sign in (or create an account) with the email address the invitation was sent to."}
            </p>
            <Link className="o-button" href={`/sign-in?next=${encodeURIComponent(next)}`}>
              {bn ? "সাইন ইন" : "Sign in"}
            </Link>
          </>
        ) : (
          <AcceptInvite token={token} email={session.user.email} />
        )}
      </div>
    </main>
  );
}
