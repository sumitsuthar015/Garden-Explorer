import type { MetadataRoute } from "next";

import { listPublishedLocationSlugs } from "@/db/queries/locations";
import { listPublishedTrailSlugs } from "@/db/queries/trails";
import { getSiteOrigin } from "@/lib/site-url";

/**
 * Dynamic sitemap.
 *
 * Only published locations and trails are listed, and the whole thing degrades
 * to the static routes if the database is unreachable, so the sitemap never
 * 500s for a crawler.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getSiteOrigin();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/explore`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/trails`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/accessibility`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.4 },
  ];

  const [locations, trails] = await Promise.all([
    listPublishedLocationSlugs(),
    listPublishedTrailSlugs(),
  ]);

  return [
    ...staticRoutes,
    ...locations.map((location) => ({
      url: `${origin}/locations/${location.slug}`,
      lastModified: location.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...trails.map((trail) => ({
      url: `${origin}/trails/${trail.slug}`,
      lastModified: trail.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
