import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
// Only when the optional Turnstile bot check is configured do we allow its script and frame.
const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? " https://challenges.cloudflare.com" : "";

// Content-Security-Policy: which places the browser may load scripts, images, videos and connections from.
// Anything not listed is blocked, so an injected script from another site cannot run.
// Allowed outside sources: Google Analytics, Meta Pixel (both only load after the visitor allows analytics),
// and YouTube/Vimeo video embeds. Next.js needs inline scripts and styles; development also needs eval.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net${turnstile}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net`,
  `frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com${turnstile}`,
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// The microphone is allowed for this site only (the assistant's voice buttons ask for it when tapped); camera, location etc. stay blocked.
// Cloudflare Turnstile (optional free bot check for the assistant) is allowed only as a script and frame.
// Basic security headers on every page (protect against clickjacking, content-type tricks and unneeded device access).
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  // preload: browsers use HTTPS for oanro.com even on the very first visit (after submitting to hstspreload.org).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // A second dev server (e.g. a preview against a throwaway database) can use its own build folder: NEXT_DIST_DIR=.next-local
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1"],
  // Don't announce "X-Powered-By: Next.js" to visitors and scanners.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The assistant icon never changes without a new file name, so browsers may keep it for a week (it loads on every page).
      { source: "/assistant/:file*.svg", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};

export default nextConfig;
