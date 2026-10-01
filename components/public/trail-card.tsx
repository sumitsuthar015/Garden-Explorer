import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Footprints } from "lucide-react";

import {
  AGE_GROUP_LABELS,
  TRAIL_DIFFICULTY_LABELS,
} from "@/lib/constants";
import type { TrailCard as TrailCardData } from "@/db/queries/trails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trailGradient } from "@/lib/subjects";
import { cn } from "@/lib/utils";

const DIFFICULTY_STARS = { easy: "⭐", moderate: "⭐⭐", challenging: "⭐⭐⭐" } as const;

interface TrailCardProps {
  trail: TrailCardData;
  /** Local progress, when the visitor has started this trail. */
  progress?: { discovered: number; total: number; percent: number; completed: boolean } | null;
  className?: string;
}

export function TrailCard({ trail, progress, className }: TrailCardProps) {
  const icon = trail.icon || "🥾";

  return (
    <Card
      className={cn(
        "group h-full overflow-hidden rounded-3xl border-2 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:rotate-[0.4deg] hover:border-primary/30 hover:shadow-lift",
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-accent">
        {trail.coverImageUrl ? (
          <Image
            src={trail.coverImageUrl}
            alt={trail.coverImageAlt ?? trail.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br",
              trailGradient(trail.slug),
            )}
          >
            <span className="dot-grid absolute inset-0 opacity-60" />
            {/* A dotted footpath that draws itself on hover. */}
            <svg viewBox="0 0 200 80" className="absolute inset-x-6 bottom-3 h-12 w-[calc(100%-3rem)]" preserveAspectRatio="none">
              <path
                d="M4 64C40 20 80 70 110 40S170 10 196 26"
                fill="none"
                stroke="var(--primary)"
                strokeOpacity="0.35"
                strokeWidth="3"
                strokeDasharray="2 8"
                strokeLinecap="round"
              />
            </svg>
            <span className="relative flex size-20 items-center justify-center rounded-full bg-white/70 text-4xl shadow-soft ring-1 ring-white transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-6 group-hover:scale-110">
              {icon}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="soft" className="bg-white/85 font-semibold text-amber-800 shadow-sm backdrop-blur">
            {DIFFICULTY_STARS[trail.difficulty]} {TRAIL_DIFFICULTY_LABELS[trail.difficulty]}
          </Badge>
          <Badge variant="outline" className="backdrop-blur">
            {AGE_GROUP_LABELS[trail.ageGroup]}
          </Badge>
          {progress?.completed ? <Badge variant="success">✓ Completed</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-heading text-xl leading-snug font-bold transition-colors group-hover:text-primary">
            {trail.name}
          </h3>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {trail.description || "A guided walk through the garden."}
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <Footprints className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Stops</dt>
            <dd>
              {trail.stopCount} {trail.stopCount === 1 ? "stop" : "stops"}
            </dd>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Duration</dt>
            <dd>about {trail.estimatedMinutes} min</dd>
          </div>
        </dl>

        {progress && progress.total > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Your progress</span>
              <span className="font-medium">
                {progress.discovered} / {progress.total}
              </span>
            </div>
            <Progress value={progress.percent} aria-label={`${progress.percent}% of trail discovered`} />
          </div>
        ) : null}

        <div className="mt-auto">
          <Button asChild className="w-full rounded-full">
            <Link href={`/trails/${trail.slug}`}>
              {progress && progress.discovered > 0 ? "Continue trail" : "Start trail"}
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              <span className="sr-only"> {trail.name}</span>
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
