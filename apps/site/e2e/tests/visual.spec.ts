import { test, expect } from "@playwright/test";

/**
 * Visual Regression Tests
 * Captures screenshots of key pages for visual comparison
 */

const PAGES_TO_SNAPSHOT = [
  { path: "/", name: "home" },
  { path: "/truth", name: "truth" },
  { path: "/runtime/quickjs", name: "runtime-quickjs" },
  { path: "/runtime/txiki", name: "runtime-txiki" },
  { path: "/benchmarks", name: "benchmarks" },
  { path: "/conformance", name: "conformance" },
  { path: "/roadmap", name: "roadmap" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

test.describe("Visual Regression", () => {
  for (const { path, name } of PAGES_TO_SNAPSHOT) {
    for (const viewport of VIEWPORTS) {
      test(`${name} page on ${viewport.name}`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Navigate to page
        await page.goto(path);
        await page.waitForLoadState("networkidle");

        // Take screenshot
        await expect(page).toHaveScreenshot(`${name}-${viewport.name}.png`, {
          maxDiffPixels: 100,
          mask: [
            // Mask dynamic content (timestamps, etc.)
            page.locator("text=Generated:").first(),
          ],
        });
      });
    }
  }
});
