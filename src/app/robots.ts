import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
// Keep admin, account and API routes out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/sign-in", "/reset-password"] }], sitemap: `${siteUrl()}/sitemap.xml` };
}
