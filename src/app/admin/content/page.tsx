import { requireAdminPage } from "@/lib/admin-guard";
import { getSiteContentFresh } from "@/lib/site-content";
import { catalogDb } from "@/lib/store-products";
import { ContentEditor } from "@/components/content-editor";
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  await requireAdminPage("content.manage");
  const content = await getSiteContentFresh(catalogDb());
  return <main id="main-content" className="container auth-page"><h1>Website content</h1>
    <p className="small-note">Change the words on the website, switch sections on or off, and edit guides, studio packages and common questions. Changes go live right after you save. &ldquo;Reset to default&rdquo; brings back the original version of that tab.</p>
    <ContentEditor initial={content} />
  </main>;
}
