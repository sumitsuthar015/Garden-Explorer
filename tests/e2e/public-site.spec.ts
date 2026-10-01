import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers";

test.describe("public site", () => {
  test("home page explains the QR learning idea and offers both calls to action", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/garden/i);

    // The main call to action must be a real link to the scanner.
    const scanLink = page.getByRole("link", { name: /scan a qr code|scan qr/i }).first();
    await expect(scanLink).toBeVisible();
    await expect(scanLink).toHaveAttribute("href", /\/scan/);

    await expect(page.getByRole("link", { name: /explore the garden|explore/i }).first()).toBeVisible();

    // The flow is explained in words, not only in a diagram.
    await expect(page.getByText("How to play — four easy steps")).toBeVisible();
    await expect(page.getByText(/how it works/i).first()).toBeVisible();
  });

  test("visitors are never asked to sign in", async ({ page }) => {
    await page.goto("/");
    const body = await page.locator("body").innerText();

    expect(body.toLowerCase()).not.toContain("log in to continue");
    expect(body.toLowerCase()).not.toContain("create an account to continue");
    expect(body.toLowerCase()).not.toContain("sign up to start");
  });

  test("explore page lists garden places as links", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Either real cards or a clear empty state is acceptable — never a blank page.
    const cards = page.locator('a[href^="/locations/"]');
    const emptyState = page.getByText(/no garden places yet/i);
    await expect(cards.first().or(emptyState.first())).toBeVisible();
  });

  test("trails page renders published trails or an honest empty state", async ({ page }) => {
    await page.goto("/trails");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const cards = page.locator('a[href^="/trails/"]');
    const emptyState = page.getByText(/no learning trails|no trails/i);
    await expect(cards.first().or(emptyState.first())).toBeVisible();
  });

  test("progress page admits that progress lives only in this browser", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).toContain("browser");
  });

  test("privacy page states what is and is not collected", async ({ page }) => {
    await page.goto("/privacy");
    const body = (await page.locator("body").innerText()).toLowerCase();

    expect(body).toContain("you never create an account");
    expect(body).toContain("anonymous");
    expect(body).toContain("local storage");
    // Never claim a legal status the project cannot verify.
    expect(body).not.toContain("gdpr compliant");
    expect(body).not.toContain("100% secure");
  });

  test("accessibility page documents the support that actually exists", async ({ page }) => {
    await page.goto("/accessibility");
    const body = (await page.locator("body").innerText()).toLowerCase();

    expect(body).toContain("keyboard");
    expect(body).toContain("screen reader");
  });

  test("scanner page is usable without a camera and offers the upload fallback", async ({ page }) => {
    await page.goto("/scan");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/upload/i).first()).toBeVisible();
    await expect(page.getByText(/camera/i).first()).toBeVisible();
  });

  test("robots and sitemap are served and keep admin out of the index", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain("Sitemap:");
    expect(robotsBody).toContain("Disallow: /admin");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    expect(xml).toContain("<urlset");
  });

  test("an unknown page shows the friendly not-found screen", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /couldn.t find that page/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();
  });

  test("the manifest is installable metadata with icons", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);

    const manifest = (await response.json()) as {
      name?: string;
      start_url?: string;
      icons?: { src: string }[];
    };

    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.icons?.length ?? 0).toBeGreaterThan(0);
  });

  test("pages do not scroll sideways on a small phone", async ({ page }) => {
    for (const path of ["/", "/explore", "/trails", "/progress", "/scan"]) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    }
  });
});
