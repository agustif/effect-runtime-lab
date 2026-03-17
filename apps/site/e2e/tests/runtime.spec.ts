import { test, expect } from "../fixtures/test.fixture"

test.describe("Runtime Detail Pages", () => {
  test("QuickJS page should display runtime details", async ({ runtimePage }) => {
    await runtimePage.goto("quickjs")
    
    await runtimePage.expectRuntimeDetails()
  })

  test("txiki page should display runtime details", async ({ runtimePage }) => {
    await runtimePage.goto("txiki")
    
    await runtimePage.expectRuntimeDetails()
  })

  test("should handle invalid runtime gracefully", async ({ page }) => {
    // Navigate to invalid runtime
    await page.goto("/runtime/invalid")
    
    // Should not crash - check that page renders
    await expect(page.locator("body")).toBeVisible()
  })
})
