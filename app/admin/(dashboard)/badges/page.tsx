import type { Metadata } from "next";
import { Info } from "lucide-react";

import { BadgeManager } from "@/components/admin/badge-manager";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listBadgesAdmin } from "@/db/queries/badges";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { listLocationOptions } from "@/db/queries/locations";
import { listTrailOptions } from "@/db/queries/trails";
import type { BadgeInput } from "@/lib/validation/badge";
import type { PublishStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Badges",
  robots: { index: false, follow: false },
};

export default async function AdminBadgesPage() {
  const garden = await ensurePrimaryGarden();
  const [badges, locations, trails] = await Promise.all([
    listBadgesAdmin(),
    listLocationOptions(garden.id),
    listTrailOptions(garden.id),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Badges"
        description="Rules, not code. Each badge stores what earns it, and the visitor's own browser decides when it has been earned."
      />

      <Alert variant="info" className="mb-5">
        <Info aria-hidden="true" />
        <div>
          <AlertTitle>How badge awarding works</AlertTitle>
          <AlertDescription>
            Visitors have no account, so progress — and therefore badges — lives in their own browser.
            Badge rules are evaluated from that local record and from the published rules published
            here. Nothing personal is collected to make this work.
          </AlertDescription>
        </div>
      </Alert>

      <BadgeManager
        badges={badges.map((badge) => ({
          id: badge.id,
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          criteriaType: badge.criteriaType as BadgeInput["criteriaType"],
          config: (badge.config ?? {}) as BadgeInput["config"],
          displayOrder: badge.displayOrder,
          status: badge.status as PublishStatus,
        }))}
        locations={locations.map((location) => ({
          id: location.id,
          name: location.name,
          slug: location.slug,
        }))}
        trails={trails.map((trail) => ({
          id: trail.id,
          name: trail.name,
          slug: trail.slug,
        }))}
      />
    </>
  );
}
