import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { CompareView } from "@/components/saved-pages";

// Personal page (the list lives in the browser): never indexed.
export const metadata: Metadata = {
  title: "Compare products",
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  if (!getSiteConfig().products) notFound();
  return (
    <main id="main-content">
      <CompareView />
    </main>
  );
}
