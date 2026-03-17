import { test, expect } from "../fixtures/test.fixture"

test.describe("Truth Surface Page", () => {
  test("should display runtime snapshot table", async ({ truthPage }) => {
    await truthPage.goto()
    
    await truthPage.expectHeading("Verified surfaces at a glance")
    await truthPage.expectTableVisible()
  })

  test("should display conformance snapshot", async ({ truthPage }) => {
    await truthPage.goto()
    
    await expect(truthPage.conformanceSnapshot).toBeVisible()
  })

  test("should have working navigation links", async ({ truthPage, page }) => {
    await truthPage.goto()
    
    // Check for navigation links
    const quickjsLink = page.getByRole("link", { name: /quickjs/i }).first()
    const txikiLink = page.getByRole("link", { name: /txiki/i }).first()
    const benchmarksLink = page.getByRole("link", { name: /benchmarks/i })
    
    await expect(quickjsLink).toBeVisible()
    await expect(txikiLink).toBeVisible()
    await expect(benchmarksLink).toBeVisible()
  })
})
