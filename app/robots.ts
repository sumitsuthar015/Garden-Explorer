import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/site-url";

/**
 * Public garden content is indexable. The admin area, the authenticated API and
 * the QR entry points are not — `/q/*` redirects search engines to the canonical
 * location page instead of indexing a QR link.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/locations/", "/trails/", "/about", "/accessibility"],
        disallow: ["/admin", "/admin/", "/api/", "/q/", "/progress", "/scan"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
