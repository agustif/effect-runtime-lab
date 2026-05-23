import { test as base, expect, type Page, type Locator } from "@playwright/test";

/**
 * Base Page Object Model
 * All page objects extend this class
 */
export abstract class BasePage {
  constructor(public page: Page) {}

  async navigate(path: string = "/") {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  async expectUrl(path: string) {
    await expect(this.page).toHaveURL(new RegExp(`.*${path}`));
  }

  // Common elements
  get header() {
    return this.page.getByRole("banner");
  }

  get main() {
    return this.page.getByRole("main");
  }

  get footer() {
    return this.page.getByRole("contentinfo");
  }

  get navigation() {
    return this.page.getByRole("navigation");
  }

  // Common actions
  async clickNavLink(name: string) {
    await this.navigation.getByRole("link", { name }).click();
  }

  async expectTitle(title: string) {
    await expect(this.page).toHaveTitle(new RegExp(title));
  }

  async expectHeading(name: string) {
    await expect(this.page.getByRole("heading", { name })).toBeVisible();
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  }
}

/**
 * Home Page Object
 */
export class HomePage extends BasePage {
  async goto() {
    await this.navigate("/");
    await this.waitForPageLoad();
  }

  get heroSection() {
    return this.page.locator(".hero");
  }

  get quickJSCard() {
    return this.page.locator(".card").filter({ hasText: "QuickJS" });
  }

  get txikiCard() {
    return this.page.locator(".card").filter({ hasText: "txiki" });
  }

  get conformanceCard() {
    return this.page.locator(".card").filter({ hasText: "Conformance" });
  }

  get benchmarksCard() {
    return this.page.locator(".card").filter({ hasText: "Benchmarks" });
  }

  async expectCardsVisible() {
    await expect(this.quickJSCard).toBeVisible();
    await expect(this.txikiCard).toBeVisible();
    await expect(this.conformanceCard).toBeVisible();
    await expect(this.benchmarksCard).toBeVisible();
  }
}

/**
 * Truth Surface Page Object
 */
export class TruthPage extends BasePage {
  async goto() {
    await this.navigate("/truth");
    await this.waitForPageLoad();
  }

  get runtimeSnapshotTable() {
    return this.page.locator("table").filter({ hasText: "Runtime" });
  }

  get conformanceSnapshot() {
    return this.page.locator(".card").filter({ hasText: "Conformance Snapshot" });
  }

  async expectTableVisible() {
    await expect(this.runtimeSnapshotTable).toBeVisible();
  }
}

/**
 * Runtime Detail Page Object
 */
export class RuntimePage extends BasePage {
  async goto(runtime: "quickjs" | "txiki") {
    await this.navigate(`/runtime/${runtime}`);
    await this.waitForPageLoad();
  }

  get supportMatrixSection() {
    return this.page.locator(".section").filter({ hasText: "Support Matrix" });
  }

  get scorecardSection() {
    return this.page.locator(".section").filter({ hasText: "Scorecard" });
  }

  async expectRuntimeDetails() {
    await expect(this.supportMatrixSection).toBeVisible();
    await expect(this.scorecardSection).toBeVisible();
  }
}

/**
 * Benchmarks Page Object
 */
export class BenchmarksPage extends BasePage {
  async goto() {
    await this.navigate("/benchmarks");
    await this.waitForPageLoad();
  }

  get artifactsTable() {
    return this.page.locator("table").filter({ hasText: "Artifacts" });
  }

  get startupTable() {
    return this.page.locator("table").filter({ hasText: "Startup" });
  }

  async expectBenchmarksVisible() {
    await expect(this.artifactsTable).toBeVisible();
  }
}

/**
 * Conformance Page Object
 */
export class ConformancePage extends BasePage {
  async goto() {
    await this.navigate("/conformance");
    await this.waitForPageLoad();
  }

  get curatedResultsTable() {
    return this.page.locator("table").filter({ hasText: "Curated Results" });
  }

  async expectConformanceVisible() {
    await expect(this.curatedResultsTable).toBeVisible();
  }
}

/**
 * Roadmap Page Object
 */
export class RoadmapPage extends BasePage {
  async goto() {
    await this.navigate("/roadmap");
    await this.waitForPageLoad();
  }

  async expectRoadmapVisible() {
    await expect(this.page.locator(".section")).toBeVisible();
  }
}

// Export all page objects
export { expect };
