import { requireAdminPage } from "@/lib/admin-guard";
import { listBanners } from "@/lib/banner-store";
import { catalogDb } from "@/lib/store-products";
import { BannerManager } from "@/components/banner-manager";
export const dynamic = "force-dynamic";

export default async function BannersPage() {
  await requireAdminPage("banners.manage");
  const rows = await listBanners(catalogDb());
  return <main id="main-content" className="container auth-page"><h1>Announcement bar</h1>
    <p className="small-note">Messages that rotate in the bar at the very top of the website. When none are active, the bar shows the automatic delivery and payment messages.</p>
    <BannerManager initial={rows.map(b => ({ ...b, startsAt: b.startsAt?.toISOString() ?? null, endsAt: b.endsAt?.toISOString() ?? null, updatedAt: b.updatedAt.toISOString() }))} />
  </main>;
}
