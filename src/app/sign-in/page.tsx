import { AuthPanel } from "@/components/auth-panel";
import { Localized } from "@/components/locale";
import { authConfigured } from "@/lib/auth";
export default function SignInPage() {
  return <main id="main-content" className="container auth-page">{authConfigured() ? <AuthPanel google={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} /> : <section className="auth-card"><h1><Localized en="Account access coming soon" bn="অ্যাকাউন্ট সুবিধা শীঘ্রই আসছে" /></h1><p><Localized en="Sign-in is not enabled yet. You can continue browsing and using the demo bag." bn="এখনো sign-in চালু হয়নি। পণ্য দেখতে ও demo bag ব্যবহার করতে পারবেন।" /></p></section>}</main>;
}
