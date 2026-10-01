import type { Metadata } from "next";

import { ProgressDashboard } from "@/components/public/progress-dashboard";
import { SectionHeading } from "@/components/public/section-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { listPublishedBadges } from "@/db/queries/badges";
import { getPublishedLocationCategoryIndex, listPublishedLocationCards } from "@/db/queries/locations";
import { listPublishedTrails, listTrailStops } from "@/db/queries/trails";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My progress",
  description:
    "Your discovered garden places, XP, badges and trail progress — stored privately in your own browser.",
  alternates: { canonical: "/progress" },
  robots: { index: false, follow: true },
};

export default async function ProgressPage() {
  const [locations, trails, badges, categoryIndex] = await Promise.all([
    listPublishedLocationCards({ limit: 200 }),
    listPublishedTrails(),
    listPublishedBadges(),
    getPublishedLocationCategoryIndex(),
  ]);

  const trailDetails = await Promise.all(
    trails.map(async (trail) => {
      const stops = await listTrailStops(trail.id);
      return {
        slug: trail.slug,
        name: trail.name,
        stopCount: trail.stopCount,
        stops: stops.map((stop) => ({ slug: stop.location.slug, name: stop.location.name })),
      };
    }),
  );

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        as="h1"
        eyebrow="My progress"
        title="My Explorer Passport"
        description="Your level, XP, stamps and badges. Everything below is stored only on this device — there is no account, no sign-in and nothing sent to the garden."
      />

      <Alert variant="info" className="mt-6 rounded-2xl">
        <Info aria-hidden="true" />
        <AlertTitle>This progress stays on your device</AlertTitle>
        <AlertDescription>
          If you clear your browser storage, your points, badges and trail progress will be lost.
          We hold no copy, so it cannot be restored.
        </AlertDescription>
      </Alert>

      <div className="mt-8">
        <ProgressDashboard
          places={locations.map((location) => ({
            slug: location.slug,
            name: location.name,
            icon: location.icon,
            category: location.category,
            trailSlug: null,
          }))}
          trails={trailDetails}
          badges={badges}
          locationCategories={categoryIndex}
        />
      </div>
    </div>
  );
}
