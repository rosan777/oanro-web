import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Content-Security-Policy: which places the browser may load scripts, images, videos and connections from.
// Anything not listed is blocked, so an injected script from another site cannot run.
// Allowed outside sources: Google Analytics, Meta Pixel (both only load after the visitor allows analytics),
// and YouTube/Vimeo video embeds. Next.js needs inline scripts and styles; development also needs eval.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net`,
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Basic security headers on every page (protect against clickjacking, content-type tricks and unneeded device access).
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  // preload: browsers use HTTPS for oanro.com even on the very first visit (after submitting to hstspreload.org).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Don't announce "X-Powered-By: Next.js" to visitors and scanners.
  poweredByHeader: false,
  async headers() { return [{ source: "/:path*", headers: securityHeaders }]; },
};

export default nextConfig;
