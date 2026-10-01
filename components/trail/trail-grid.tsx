"use client";

import type { TrailCard as TrailCardData } from "@/db/queries/trails";
import { Reveal } from "@/components/motion/reveal";
import { TrailCard } from "@/components/public/trail-card";
import { useVisitorProgress } from "@/hooks/use-visitor-progress";
import { trailSummary } from "@/lib/progress/actions";

/** Trail grid decorated with the visitor's own device-local progress. */
export function TrailGrid({ trails }: { trails: TrailCardData[] }) {
  const { progress, ready } = useVisitorProgress();

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {trails.map((trail, index) => {
        const record = progress.trails[trail.slug];
        const summary = ready
          ? trailSummary(progress, trail.slug, trail.stopCount)
          : null;

        return (
          <Reveal key={trail.id} delay={(index % 3) * 110} className="h-full">
            <TrailCard
              trail={trail}
              progress={
                summary && record
                  ? {
                      discovered: summary.discovered,
                      total: summary.total,
                      percent: summary.percent,
                      completed: summary.completed,
                    }
                  : null
              }
            />
          </Reveal>
        );
      })}
    </div>
  );
}
