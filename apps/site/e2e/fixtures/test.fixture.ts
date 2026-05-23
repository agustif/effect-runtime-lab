import { test as base, expect } from "@playwright/test";
import {
  HomePage,
  TruthPage,
  RuntimePage,
  BenchmarksPage,
  ConformancePage,
  RoadmapPage,
} from "../pages/base.page";

/**
 * Extended test fixture with page objects
 */
export const test = base.extend<{
  homePage: HomePage;
  truthPage: TruthPage;
  runtimePage: RuntimePage;
  benchmarksPage: BenchmarksPage;
  conformancePage: ConformancePage;
  roadmapPage: RoadmapPage;
}>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  truthPage: async ({ page }, use) => {
    await use(new TruthPage(page));
  },
  runtimePage: async ({ page }, use) => {
    await use(new RuntimePage(page));
  },
  benchmarksPage: async ({ page }, use) => {
    await use(new BenchmarksPage(page));
  },
  conformancePage: async ({ page }, use) => {
    await use(new ConformancePage(page));
  },
  roadmapPage: async ({ page }, use) => {
    await use(new RoadmapPage(page));
  },
});

export { expect };
