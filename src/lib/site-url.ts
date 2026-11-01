/** Public base URL for canonical links, sitemap and share previews. */
export const siteUrl = () => {
  const authUrl = process.env.BETTER_AUTH_URL;

  // OANRO_SITE_URL wins; otherwise the auth URL, unless it points at this computer; otherwise the live domain.

  const publicUrl =
    process.env.OANRO_SITE_URL ||
    (authUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(?::|\/|$)/i.test(authUrl)
      ? authUrl
      : "https://oanro.com");
  return publicUrl.replace(/\/$/, "");
};
