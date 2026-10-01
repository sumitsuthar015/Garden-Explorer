import { describe, expect, it } from "vitest";

import { clamp, formatFileSize, moveItem, percent, slugify } from "@/lib/utils";
import { rangeToDays } from "@/lib/validation/analytics";
import { paginationSchema } from "@/lib/validation/common";
import { MAX_PAGE_SIZE } from "@/lib/constants";

describe("slugify", () => {
  it("makes a URL-safe slug from a garden place name", () => {
    expect(slugify("Butterfly Garden")).toBe("butterfly-garden");
    expect(slugify("Medicinal Plant Garden")).toBe("medicinal-plant-garden");
    expect(slugify("  Rose  Garden  ")).toBe("rose-garden");
    expect(slugify("Pond 2 (north)")).toBe("pond-2-north");
  });

  it("never returns a leading or trailing dash", () => {
    expect(slugify("— —")).toBe("");
    expect(slugify("...trees...")).toBe("trees");
  });
});

describe("moveItem", () => {
  it("reorders without mutating the input", () => {
    const items = ["a", "b", "c"];
    expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a"]);
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("returns the same array for impossible moves", () => {
    const items = ["a", "b"];
    expect(moveItem(items, -1, 1)).toBe(items);
    expect(moveItem(items, 0, 0)).toBe(items);
    expect(moveItem(items, 5, 1)).toBe(items);
  });
});

describe("percent", () => {
  it("guards divide-by-zero and clamps the result", () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(3, 4)).toBe(75);
    expect(percent(10, 4)).toBe(100);
  });
});

describe("clamp", () => {
  it("keeps a number inside the range", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-5, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});

describe("formatFileSize", () => {
  it("describes image sizes in the units an admin expects", () => {
    expect(formatFileSize(0)).toBe("—");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(1_572_864)).toBe("1.5 MB");
  });
});

describe("paginationSchema", () => {
  it("defaults to the first page and rejects absurd page sizes", () => {
    const defaults = paginationSchema.parse({});
    expect(defaults.page).toBe(1);
    expect(defaults.pageSize).toBeGreaterThan(0);
    expect(defaults.direction).toBe("desc");

    const capped = paginationSchema.parse({ page: "3", pageSize: "5000" });
    expect(capped.page).toBe(3);
    expect(capped.pageSize).toBeLessThanOrEqual(MAX_PAGE_SIZE);

    // Garbage in the URL must not break a page render.
    const safe = paginationSchema.parse({ page: "abc", pageSize: "-4" });
    expect(safe.page).toBe(1);
    expect(safe.pageSize).toBeGreaterThan(0);
  });
});

describe("rangeToDays", () => {
  it("maps analytics ranges onto day counts", () => {
    expect(rangeToDays("7d")).toBe(7);
    expect(rangeToDays("30d")).toBe(30);
    expect(rangeToDays("90d")).toBe(90);
    expect(rangeToDays("all")).toBeNull();
  });
});
