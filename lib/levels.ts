/**
 * Explorer levels — a friendly ladder kids climb as they earn XP.
 *
 * Thresholds are tuned so one place (≈100 XP with its activities and quiz)
 * moves a young visitor visibly along, and finishing every place in the
 * garden reaches the top level.
 */

export interface ExplorerLevel {
  level: number;
  name: string;
  icon: string;
  minXp: number;
}

export const LEVELS: readonly ExplorerLevel[] = [
  { level: 1, name: "Seed", icon: "🌰", minXp: 0 },
  { level: 2, name: "Sprout", icon: "🌱", minXp: 50 },
  { level: 3, name: "Sapling", icon: "🌿", minXp: 150 },
  { level: 4, name: "Blossom", icon: "🌸", minXp: 300 },
  { level: 5, name: "Tree", icon: "🌳", minXp: 500 },
  { level: 6, name: "Forest Guardian", icon: "🦉", minXp: 800 },
  { level: 7, name: "Garden Genius", icon: "🏆", minXp: 1200 },
];

export interface LevelProgress {
  current: ExplorerLevel;
  /** Null once the top level is reached. */
  next: ExplorerLevel | null;
  /** 0–100 progress from the current level towards the next one. */
  percent: number;
  xpToNext: number;
}

export function levelForXp(xp: number): LevelProgress {
  const safeXp = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;

  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (safeXp >= LEVELS[i].minXp) index = i;
  }

  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;

  if (!next) return { current, next: null, percent: 100, xpToNext: 0 };

  const span = next.minXp - current.minXp;
  const into = safeXp - current.minXp;

  return {
    current,
    next,
    percent: Math.min(100, Math.round((into / span) * 100)),
    xpToNext: next.minXp - safeXp,
  };
}

/** The level reached when XP moves from `before` to `after`, if it changed. */
export function levelUpBetween(before: number, after: number): ExplorerLevel | null {
  const from = levelForXp(before).current;
  const to = levelForXp(after).current;
  return to.level > from.level ? to : null;
}
