import { expect, test } from "@playwright/test";

import { SEEDED_LOCATION, SEEDED_QR_CODE, requireSeededGarden } from "./helpers";

test.describe("QR entry point", () => {
  test("a printed sign opens the arrival screen for its place", async ({ page }) => {
    await requireSeededGarden(page, `/q/${SEEDED_QR_CODE}`);

    await expect(page.getByText(/you found it/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: SEEDED_LOCATION })).toBeVisible();
    await expect(page.getByRole("button", { name: /start learning/i })).toBeVisible();
  });

  test("nothing is graded or counted until the visitor starts", async ({ page }) => {
    await requireSeededGarden(page, `/q/${SEEDED_QR_CODE}`);

    await expect(page.getByRole("button", { name: /start learning/i })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
  });

  test("an unknown code shows the friendly not-found screen, never a database error", async ({
    page,
  }) => {
    const response = await page.goto("/q/THIS-CODE-DOES-NOT-EXIST");

    expect(response?.status()).toBe(404);
    await expect(page.getByText(/qr code not found/i)).toBeVisible();

    const body = await page.locator("body").innerText();
    expect(body).not.toContain("postgres");
    expect(body).not.toContain("ECONNREFUSED");
    expect(body.toLowerCase()).not.toContain("stack trace");
    await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();
  });

  test("an unsafe code in the URL cannot reach a query", async ({ page }) => {
    const response = await page.goto("/q/..%2F..%2Fetc%2Fpasswd");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/qr code not found/i)).toBeVisible();
  });

  test("a later stop can be scanned directly and is never blocked", async ({ page }) => {
    // MONSOON-016 is the final stop of the seeded science trail.
    await requireSeededGarden(page, "/q/MONSOON-016");

    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).not.toContain("access denied");
    expect(body.toLowerCase()).not.toContain("you skipped");
    await expect(page.getByRole("button", { name: /start learning/i })).toBeVisible();
  });
});

test.describe("learning experience", () => {
  test("a visitor learns, observes, answers a quiz wrongly, gets help and still finishes", async ({
    page,
  }) => {
    await requireSeededGarden(page, `/q/${SEEDED_QR_CODE}`);

    await page.getByRole("button", { name: /start learning/i }).click();

    // Step 1 of the seeded Butterfly Watch is the reading step.
    await expect(page.getByRole("button", { name: /^continue$/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^continue$/i }).click();

    // ---- Observation activity: "I found one" is always accepted.
    const observation = page.getByRole("button", { name: /i found one/i });
    await expect(observation).toBeVisible({ timeout: 15000 });
    await observation.click();
    await expect(page.getByText(/nice work|well spotted|correct|great/i).first()).toBeVisible();

    await page.getByRole("button", { name: /^continue$/i }).click();

    // ---- Yes/No activity: answering either way must be graded, not blocked.
    const yes = page.getByRole("button", { name: /^yes$/i });
    await expect(yes).toBeVisible({ timeout: 15000 });
    await yes.click();
    await page.getByRole("button", { name: /check my answer/i }).click();
    await expect(page.getByText(/nice work|well spotted|correct|almost|have another/i).first()).toBeVisible();

    await page.getByRole("button", { name: /^continue$/i }).click();

    // ---- Quiz: the seeded first option is correct, so the last option is wrong.
    const options = page.getByRole("radio");
    await expect(options.first()).toBeVisible({ timeout: 15000 });
    await options.nth((await options.count()) - 1).check();
    await page.getByRole("button", { name: /check my answer/i }).click();

    // Gentle coaching, a hint and a retry — never a failure message.
    await expect(page.getByText(/not quite/i)).toBeVisible();
    await expect(page.getByRole("alert").getByText(/hint/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();

    const afterWrong = await page.locator("body").innerText();
    expect(afterWrong.toLowerCase()).not.toContain("you failed");
    expect(afterWrong.toLowerCase()).not.toContain("game over");

    // ---- Keep trying: after the final attempt the answer is revealed.
    // Wait for each graded attempt to come back rather than for a fixed time,
    // so a slow connection to the database can't make the check flaky.
    const checking = page.getByRole("button", { name: /checking/i });

    await options.nth((await options.count()) - 1).check();
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(checking).toHaveCount(0, { timeout: 15000 });

    const thirdTryButton = page.getByRole("button", { name: /try again|continue/i }).first();
    if (await thirdTryButton.isVisible().catch(() => false)) {
      await options.nth((await options.count()) - 1).check();
      await thirdTryButton.click();
      await expect(checking).toHaveCount(0, { timeout: 15000 });
    }

    const revealed = await page.locator("body").innerText();
    expect(/here is the answer|participation points|next question|finish quiz/i.test(revealed)).toBe(
      true,
    );
    expect(revealed.toLowerCase()).toContain("never cost you anything");
  });
});
