import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    axe: {
      run: (options?: object) => Promise<{ violations: unknown[] }>;
    };
  }
}

/**
 * Accessibility Tests
 * Runs axe-core accessibility checks on all pages
 */

const PAGES_TO_CHECK = [
  "/",
  "/truth",
  "/runtime/quickjs",
  "/runtime/txiki",
  "/benchmarks",
  "/conformance",
  "/roadmap",
];

test.describe("Accessibility", () => {
  for (const pagePath of PAGES_TO_CHECK) {
    test(`axe-core check on ${pagePath}`, async ({ page }, testInfo) => {
      await page.goto(pagePath);
      await page.waitForLoadState("networkidle");

      // Inject axe-core from CDN
      await page.addScriptTag({
        url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js",
      });

      // Wait for axe to load
      await page.waitForFunction(() => typeof window.axe !== "undefined");

      // Run axe-core
      const accessibilityScanResults = await page.evaluate(async () => {
        return await window.axe.run({
          rules: {
            // Disable some rules that are known to be problematic in test environments
            "color-contrast": { enabled: false },
          },
        });
      });

      // Attach violations to test report
      await testInfo.attach("accessibility-scan-results", {
        body: JSON.stringify(accessibilityScanResults, null, 2),
        contentType: "application/json",
      });

      // Expect no violations
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
