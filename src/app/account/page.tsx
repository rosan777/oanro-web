import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession, isOwner } from "@/lib/access";
import { SignOut } from "@/components/auth-panel";
import { Localized } from "@/components/locale";
export default async function AccountPage() {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  const owner = await isOwner(session.user.id);
  return <main id="main-content" className="container auth-page"><section className="auth-card"><h1><Localized en="Your account" bn="আপনার অ্যাকাউন্ট" /></h1><p>{session.user.name}</p><p>{session.user.email}</p><p><Localized en="Order history and delivery tools will arrive with checkout." bn="Checkout চালু হলে order history ও delivery সুবিধা আসবে।" /></p>{owner && <Link className="button" href="/admin"><Localized en="Owner workspace" bn="Owner workspace" /></Link>}<SignOut /></section></main>;
}
