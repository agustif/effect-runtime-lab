import { test, expect } from "../fixtures/test.fixture";

test.describe("Home Page", () => {
  test("should display hero section and content", async ({ homePage }) => {
    await homePage.goto();

    // Check hero section
    await expect(homePage.heroSection).toBeVisible();
    await homePage.expectHeading("Effect for embedded JavaScript engines");

    // Check summary cards are visible
    await expect(homePage.page.locator(".summary-grid").first()).toBeVisible();
  });

  test("should navigate to all main sections", async ({ homePage }) => {
    await homePage.goto();

    // Navigate to Runtimes
    await homePage.clickNavLink("Runtimes");
    await expect(homePage.page).toHaveURL(/.*\/runtimes/);

    // Navigate back and go to Benchmarks
    await homePage.goto();
    await homePage.clickNavLink("Benchmarks");
    await expect(homePage.page).toHaveURL(/.*\/benchmarks/);

    // Navigate back and go to Conformance
    await homePage.goto();
    await homePage.clickNavLink("Conformance");
    await expect(homePage.page).toHaveURL(/.*\/conformance/);

    // Navigate back and go to Roadmap
    await homePage.goto();
    await homePage.clickNavLink("Roadmap");
    await expect(homePage.page).toHaveURL(/.*\/roadmap/);
  });

  test("should display correct metadata", async ({ homePage }) => {
    await homePage.goto();
    await homePage.expectTitle("Effect Runtime Lab");
  });

  test("should be responsive", async ({ homePage }) => {
    await homePage.goto();

    // Test desktop viewport
    await homePage.page.setViewportSize({ width: 1280, height: 720 });
    await expect(homePage.heroSection).toBeVisible();

    // Test tablet viewport
    await homePage.page.setViewportSize({ width: 768, height: 1024 });
    await expect(homePage.heroSection).toBeVisible();

    // Test mobile viewport
    await homePage.page.setViewportSize({ width: 375, height: 667 });
    await expect(homePage.heroSection).toBeVisible();
  });
});
