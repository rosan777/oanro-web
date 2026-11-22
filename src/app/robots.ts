import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
// Keep admin, account and API routes out of search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/products/*/image", "/api/services/*/image", "/api/campaigns/*/image", "/api/site-media/*"],
        disallow: ["/admin", "/api/", "/account", "/sign-in", "/reset-password", "/bn/admin", "/bn/account", "/bn/sign-in", "/bn/reset-password"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
