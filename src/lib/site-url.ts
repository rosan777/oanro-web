/** Public base URL for canonical links, sitemap and share previews. */
export const siteUrl = () => (process.env.OANRO_SITE_URL || process.env.BETTER_AUTH_URL || "https://oanro-web-five.vercel.app").replace(/\/$/, "");
