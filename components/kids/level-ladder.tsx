"use client";

import { Reveal } from "@/components/motion/reveal";
import { useVisitorProgress } from "@/hooks/use-visitor-progress";
import { LEVELS, levelForXp } from "@/lib/levels";
import { cn } from "@/lib/utils";

/** Each level sits a step higher than the last, like stairs to climb. */
const STAIR_OFFSETS = ["sm:mt-24", "sm:mt-20", "sm:mt-16", "sm:mt-12", "sm:mt-8", "sm:mt-4", "sm:mt-0"];

/** The level staircase, with "YOU" on the level this device has reached. */
export function LevelLadder() {
  const { progress, ready } = useVisitorProgress();
  const currentLevel = ready && progress.xp > 0 ? levelForXp(progress.xp).current.level : 0;

  return (
    <ol className="grid grid-cols-4 gap-x-2 gap-y-8 sm:grid-cols-7">
      {LEVELS.map((level, index) => {
        const isCurrent = level.level === currentLevel;
        const reached = level.level < currentLevel;

        return (
          <Reveal
            as="li"
            key={level.level}
            delay={index * 90}
            className={cn("flex flex-col items-center gap-2 text-center", STAIR_OFFSETS[index])}
          >
            <span
              className={cn(
                "relative flex size-16 items-center justify-center rounded-full border-4 text-3xl transition-transform duration-300 hover:-rotate-6 hover:scale-110 sm:size-20 sm:text-4xl",
                isCurrent
                  ? "animate-glow-pulse border-amber-400 bg-amber-100"
                  : reached
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-dashed border-emerald-200 bg-card",
              )}
            >
              <span aria-hidden="true" className={cn(!isCurrent && !reached && currentLevel > 0 && "opacity-60")}>
                {level.icon}
              </span>
              {isCurrent ? (
                <span className="absolute -top-3 rounded-full bg-amber-400 px-2 py-0.5 font-heading text-[10px] font-bold text-amber-950 shadow-sm">
                  YOU
                </span>
              ) : null}
            </span>
            <span className="font-heading text-sm leading-tight font-bold sm:text-base">
              {level.name}
              {isCurrent ? <span className="sr-only"> — your level</span> : null}
            </span>
            <span className="text-xs text-muted-foreground">{level.minXp} XP</span>
          </Reveal>
        );
      })}
    </ol>
  );
}
