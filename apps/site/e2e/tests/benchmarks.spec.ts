import { test, expect } from "../fixtures/test.fixture";

test.describe("Benchmarks Page", () => {
  test("should display benchmarks data", async ({ benchmarksPage }) => {
    await benchmarksPage.goto();

    await benchmarksPage.expectHeading("Benchmarks");
    await benchmarksPage.expectBenchmarksVisible();
  });

  test("should display platform information", async ({ benchmarksPage, page }) => {
    await benchmarksPage.goto();

    // Check for platform info
    const platformText = page.getByText(/Platform:/i);
    await expect(platformText).toBeVisible();

    // Check for generated timestamp
    const generatedText = page.getByText(/Generated:/i);
    await expect(generatedText).toBeVisible();
  });
});
