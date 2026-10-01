import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * Deliberately pragmatic rather than maximally strict:
 *  - Next.js injects inline bootstrap/flight scripts, so `'unsafe-inline'` is
 *    required for scripts unless a nonce pipeline is introduced. Adding a
 *    nonce would mean making every route dynamic and is a project in itself;
 *    the honest trade-off is documented in the README.
 *  - `'unsafe-eval'` is only allowed in development (React refresh needs it).
 *  - `connect-src` covers the Cloudinary upload endpoint and Neon's WebSocket
 *    proxy. `worker-src blob:` is required by html5-qrcode's decoder worker.
 *  - `frame-ancestors 'none'` plus X-Frame-Options blocks clickjacking.
 *  - `frame-src` allows only Google Maps, for the garden map a visitor
 *    explicitly opens in the "Visit the garden" section.
 */
function contentSecurityPolicy(): string {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (!isProduction) scriptSrc.push("'unsafe-eval'");

  const connectSrc = ["'self'"];
  connectSrc.push("https://api.cloudinary.com", "https://res.cloudinary.com");
  connectSrc.push("wss://*.neon.tech", "https://*.neon.tech");
  if (!isProduction) connectSrc.push("ws:", "http://localhost:3000");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com",
    "media-src 'self' blob: https://res.cloudinary.com https://*.cloudinary.com",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The QR scanner needs the camera. Nothing else is requested — in
    // particular geolocation is explicitly disabled, matching the product rule
    // that this site never uses GPS.
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

if (isProduction) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Don't let `next dev` write AGENTS.md / CLAUDE.md into the project.
  agentRules: false,

  images: {
    // Cloudinary is the only remote media host. `f_auto,q_auto` delivery URLs
    // are requested through next/image so sizes stay responsive.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "*.cloudinary.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
  },

  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // The service worker must never be served stale, or updates never land.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        // Authenticated and analytics endpoints are never cacheable.
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
