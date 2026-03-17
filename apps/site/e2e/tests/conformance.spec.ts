import { test, expect } from "../fixtures/test.fixture"

test.describe("Conformance Page", () => {
  test("should display conformance data", async ({ conformancePage }) => {
    await conformancePage.goto()
    
    await conformancePage.expectHeading("Conformance")
    await conformancePage.expectConformanceVisible()
  })

  test("should display curated results", async ({ conformancePage, page }) => {
    await conformancePage.goto()
    
    // Check for curated results section
    const curatedSection = page.locator(".section").filter({ hasText: "Curated Results" })
    await expect(curatedSection).toBeVisible()
  })
})
