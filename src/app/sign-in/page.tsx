import { AuthPanel } from "@/components/auth-panel";
import { Localized } from "@/components/locale";
import { authConfigured } from "@/lib/auth";
/** Only same-site paths are allowed as the post-login destination (no open redirects). */
const safeNext = (value: unknown) => typeof value === "string" && /^\/(?![\/\\])[\w\-/]*$/.test(value) ? value : "/account";
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next);
  return <main id="main-content" className="container auth-page">{authConfigured() ? <AuthPanel next={next} google={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} /> : <section className="auth-card"><h1><Localized en="Account access coming soon" bn="অ্যাকাউন্ট সুবিধা শীঘ্রই আসছে" /></h1><p><Localized en="Sign-in is not enabled yet. You can continue browsing and using the demo bag." bn="এখনো sign-in চালু হয়নি। পণ্য দেখতে ও demo bag ব্যবহার করতে পারবেন।" /></p></section>}</main>;
}
