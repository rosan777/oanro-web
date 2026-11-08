import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentSession } from "@/lib/access";
import { getSiteConfig } from "@/lib/site-config";
import { WishlistView } from "@/components/saved-pages";

// Personal page: never indexed.
export const metadata: Metadata = { title: "Wishlist", robots: { index: false, follow: true } };

export default async function WishlistPage() {
  if (!getSiteConfig().products) notFound();
  const session = await currentSession().catch(() => null);
  return (
    <main id="main-content">
      <WishlistView signedIn={Boolean(session?.user)} />
    </main>
  );
}
