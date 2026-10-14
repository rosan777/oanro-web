import { AuthPanel } from "@/components/auth-panel";
import { Localized } from "@/components/locale";
import { authConfigured } from "@/lib/auth";
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main id="main-content" className="container auth-page">{authConfigured() && typeof token === "string" && token.length < 1024 ? <AuthPanel google={false} resetToken={token} /> : <section className="auth-card"><h1><Localized en="Reset unavailable" bn="Reset করা যাচ্ছে না" /></h1><a href="/sign-in"><Localized en="Request a new link" bn="নতুন লিংক নিন" /></a></section>}</main>;
}
