import { test, expect } from "../fixtures/test.fixture";

test.describe("Roadmap Page", () => {
  test("should display roadmap content", async ({ roadmapPage }) => {
    await roadmapPage.goto();

    await roadmapPage.expectRoadmapVisible();
  });

  test("should display roadmap heading", async ({ roadmapPage }) => {
    await roadmapPage.goto();

    await roadmapPage.expectHeading("Roadmap");
  });
});
