"use client";

import Link from "next/link";

import { useVisitorProgress } from "@/hooks/use-visitor-progress";
import { levelForXp } from "@/lib/levels";
import { cn } from "@/lib/utils";

/**
 * The explorer's level and XP, always one glance away in the header. The XP
 * number re-mounts when it changes so it pops each time a kid earns points.
 */
export function LevelChip({ className }: { className?: string }) {
  const { progress, ready } = useVisitorProgress();
  if (!ready || progress.xp === 0) return null;

  const { current, percent } = levelForXp(progress.xp);

  return (
    <Link
      href="/progress"
      aria-label={`Level ${current.level}, ${current.name}, ${progress.xp} XP — see my progress`}
      className={cn(
        "group flex h-9 items-center gap-2 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-lime-50 py-1 pr-3 pl-1 shadow-soft transition-transform hover:scale-105",
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-white text-base shadow-sm transition-transform group-hover:rotate-12">
        {current.icon}
      </span>
      <span className="flex flex-col leading-none">
        <span key={progress.xp} className="animate-bounce-in font-heading text-sm font-bold text-amber-700 tabular-nums">
          {progress.xp} XP
        </span>
        <span className="mt-1 h-1 w-14 overflow-hidden rounded-full bg-amber-100">
          <span className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-lime-500" style={{ width: `${percent}%` }} />
        </span>
      </span>
    </Link>
  );
}
