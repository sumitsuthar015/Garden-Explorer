"use client";

import { Reveal } from "@/components/motion/reveal";
import { useVisitorProgress } from "@/hooks/use-visitor-progress";
import type { BadgeDefinition } from "@/lib/badges";
import { cn } from "@/lib/utils";

/** Every badge the garden offers, lit up once this device has earned it. */
export function BadgeShowcase({ badges }: { badges: BadgeDefinition[] }) {
  const { progress, ready } = useVisitorProgress();
  const earned = new Set(ready ? progress.badges : []);

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {badges.map((badge, index) => {
        const has = earned.has(badge.code);
        return (
          <Reveal as="li" key={badge.code} delay={(index % 5) * 80} className="h-full">
            <div
              className={cn(
                "group flex h-full flex-col items-center gap-2 rounded-3xl border-2 bg-card p-4 text-center transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-lift",
                has ? "border-amber-300" : "border-border",
              )}
            >
              <span
                className={cn(
                  "relative flex size-20 items-center justify-center rounded-full text-4xl shadow-soft ring-4 ring-white transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110",
                  has
                    ? "bg-gradient-to-br from-amber-200 to-yellow-400"
                    : "bg-gradient-to-br from-slate-100 to-slate-200",
                )}
              >
                <span aria-hidden="true" className={cn(!has && "opacity-45 grayscale")}>
                  {badge.icon}
                </span>
                <span aria-hidden="true" className="absolute -right-1 -bottom-1 text-lg">
                  {has ? "✅" : "🔒"}
                </span>
              </span>
              <span className="font-heading text-base leading-tight font-bold">
                {badge.name}
                <span className="sr-only">{has ? " — earned" : " — not earned yet"}</span>
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">{badge.description}</span>
            </div>
          </Reveal>
        );
      })}
    </ul>
  );
}
