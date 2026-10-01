import type { MetadataRoute } from "next";

import { getBranding } from "@/db/queries/gardens";

/**
 * Installable web app manifest, served at /manifest.webmanifest.
 *
 * Generated from garden branding so the installed app carries the right name,
 * and rendered on demand so a rebrand in /admin/settings takes effect without a
 * redeploy. It also means the build never needs a database connection.
 */
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getBranding();

  return {
    name: `${branding.siteTitle} — QR learning trails for kids`,
    short_name: branding.siteTitle.slice(0, 24),
    description: branding.seoDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F8F3",
    theme_color: branding.primaryColor,
    lang: "en",
    dir: "ltr",
    categories: ["education", "travel", "lifestyle"],
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Scan a QR code", short_name: "Scan", url: "/scan" },
      { name: "Explore places", short_name: "Explore", url: "/explore" },
      { name: "My progress", short_name: "Progress", url: "/progress" },
    ],
    // Admin routes are intentionally excluded from the installed app's scope
    // of interest; the service worker also refuses to cache them.
  };
}
