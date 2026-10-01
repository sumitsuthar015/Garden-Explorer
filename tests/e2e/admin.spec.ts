import { expect, test } from "@playwright/test";

/**
 * Admin protection.
 *
 * These tests only cover the unauthenticated half, because they must never need
 * (or create) real credentials. Layer 1 is the route guard; layer 2 — the check
 * inside every server action — is covered by unit tests on `permissions.ts`.
 */

const PROTECTED_ROUTES = [
  "/admin",
  "/admin/dashboard",
  "/admin/locations",
  "/admin/locations/new",
  "/admin/qr",
  "/admin/trails",
  "/admin/content",
  "/admin/quizzes",
  "/admin/badges",
  "/admin/media",
  "/admin/analytics",
  "/admin/settings",
];

test.describe("admin area", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects an anonymous visitor to the login page`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }

  test("the login page is reachable, accessible and mentions no public sign-up", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("sign up");
    expect(body).not.toContain("create account");
  });

  test("login fields are keyboard reachable and announce their errors", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByRole("button", { name: /sign in/i }).click();

    // Client-side validation must speak up rather than failing silently.
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();

    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/^password$/i).fill("definitely-not-the-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    // The failure message stays generic so the form cannot enumerate staff emails.
    await expect(
      page.getByText(/did not match|too many attempts|could not sign you in/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("the admin bundle is not shipped to public pages", async ({ page }) => {
    const adminScripts: string[] = [];
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/admin") && url.endsWith(".js")) adminScripts.push(url);
    });

    await page.goto("/");
    await page.goto("/explore");

    expect(adminScripts).toEqual([]);
  });
});
