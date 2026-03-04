import { expect, test } from "@playwright/test";

const DB_NAME = "loop_habits_web";

async function resetLocalState(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(async (name) => {
    window.localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = window.indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }, DB_NAME);
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await resetLocalState(page);
});

test("user can create, complete, and archive a habit", async ({ page }) => {
  await page.goto("/habit/new");

  await page.getByLabel("Name").fill("Hydrate");
  await page.getByLabel("Prompt").fill("Drink water");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("link", { name: "Hydrate" })).toBeVisible();
  const today = await page.evaluate(() => Math.floor(Date.now() / 86_400_000) * 86_400_000);
  await page.getByTestId(`list-cell-1-${today}`).click();

  await page.getByRole("link", { name: "Hydrate" }).click();
  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("button", { name: "Unarchive" })).toBeVisible();
});

test("settings layout adapts by viewport and preferences persist", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Display" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Behavior" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByTestId("settings-grid")).toBeVisible();

  const mobileGridColumns = await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="settings-grid"]');
    if (!grid) {
      return 0;
    }
    return getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
  });
  expect(mobileGridColumns).toBe(1);

  await page.getByLabel("Show archived").click();
  await page.getByLabel("Store anonymous error diagnostics locally").click();
  await page.getByLabel("Theme").selectOption("dark");
  await page.getByLabel("First weekday").selectOption("2");

  await page.setViewportSize({ width: 1280, height: 900 });

  const desktopGridColumns = await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="settings-grid"]');
    if (!grid) {
      return 0;
    }
    return getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
  });
  expect(desktopGridColumns).toBe(2);

  await page.reload();
  await expect(page.getByLabel("Show archived")).toBeChecked();
  await expect(page.getByLabel("Store anonymous error diagnostics locally")).toBeChecked();
  await expect(page.getByLabel("Theme")).toHaveValue("dark");
  await expect(page.getByLabel("First weekday")).toHaveValue("2");
});
