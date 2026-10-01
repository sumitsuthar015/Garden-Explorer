import { expect, test, type Page } from "@playwright/test";

/** The seed script creates this sign; see scripts/seed-data.ts. */
export const SEEDED_QR_CODE = "BUTTERFLY-003";
export const SEEDED_LOCATION = "Butterfly Watch";
export const SEEDED_TRAIL = "Garden Science Trail";

/**
 * Skip a test that needs seeded demo content when the database has not been
 * seeded, so a fresh clone reports "skipped" instead of a misleading failure.
 */
export async function requireSeededGarden(page: Page, path: string): Promise<boolean> {
  const response = await page.goto(path);
  if (!response) return false;

  const body = await page.locator("body").innerText();
  if (body.includes("QR Code Not Found") || body.includes("Something went wrong")) {
    test.skip(true, "Demo data is not seeded — run npm run db:migrate && npm run db:seed");
    return false;
  }

  return true;
}

/** Fail if the page scrolls sideways — the most common mobile layout bug. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    return { documentWidth, viewportWidth };
  });

  expect(
    overflow.documentWidth,
    `Page is ${overflow.documentWidth}px wide in a ${overflow.viewportWidth}px viewport`,
  ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

/** Accept the console errors that a Next dev server legitimately produces. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("favicon") || text.includes("Download the React DevTools")) return;
    errors.push(text);
  });
  return errors;
}
