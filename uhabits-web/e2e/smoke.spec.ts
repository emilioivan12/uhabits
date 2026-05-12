import { expect, test } from "@playwright/test";

test("home page renders the scaffold greeting", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /hello, habits/i }),
  ).toBeVisible();
});
