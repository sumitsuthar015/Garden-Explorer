import { describe, expect, it } from "vitest";

import { LEVELS, levelForXp, levelUpBetween } from "@/lib/levels";

describe("explorer levels", () => {
  it("starts every new explorer as a Seed", () => {
    const progress = levelForXp(0);
    expect(progress.current.name).toBe("Seed");
    expect(progress.next?.name).toBe("Sprout");
    expect(progress.percent).toBe(0);
    expect(progress.xpToNext).toBe(50);
  });

  it("treats bad input as zero XP", () => {
    expect(levelForXp(-20).current.level).toBe(1);
    expect(levelForXp(Number.NaN).current.level).toBe(1);
  });

  it("moves up exactly at each threshold", () => {
    for (const level of LEVELS) {
      expect(levelForXp(level.minXp).current.level).toBe(level.level);
      if (level.minXp > 0) expect(levelForXp(level.minXp - 1).current.level).toBe(level.level - 1);
    }
  });

  it("reports progress towards the next level", () => {
    // Sprout (50) → Sapling (150): 100 XP into a 100 XP span is half way at 100.
    const progress = levelForXp(100);
    expect(progress.current.name).toBe("Sprout");
    expect(progress.percent).toBe(50);
    expect(progress.xpToNext).toBe(50);
  });

  it("caps at the top level", () => {
    const top = levelForXp(99_999);
    expect(top.current.name).toBe("Garden Genius");
    expect(top.next).toBeNull();
    expect(top.percent).toBe(100);
    expect(top.xpToNext).toBe(0);
  });

  it("announces a level-up only when the level changes", () => {
    expect(levelUpBetween(40, 60)?.name).toBe("Sprout");
    expect(levelUpBetween(60, 70)).toBeNull();
    expect(levelUpBetween(10, 320)?.name).toBe("Blossom");
  });
});
