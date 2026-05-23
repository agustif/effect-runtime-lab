import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

/**
 * Dead Link Detection Tests
 * Tests all internal and external links on each page
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

interface LinkResult {
  url: string;
  status: number;
  foundOn: string;
  text: string;
}

async function checkAllLinks(
  page: Page,
  request: APIRequestContext,
  pagePath: string,
  baseURL: string,
): Promise<LinkResult[]> {
  const results: LinkResult[] = [];

  await page.goto(pagePath);
  await page.waitForLoadState("networkidle");

  // Get all links on the page
  const links = await page.locator("a[href]").all();

  for (const link of links) {
    const href = await link.getAttribute("href");
    const text = (await link.textContent()) || "";

    if (!href) continue;

    // Skip mailto, tel, and anchor links
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      continue;
    }

    // Build full URL
    let url: string;
    if (href.startsWith("http")) {
      url = href;
    } else if (href.startsWith("/")) {
      url = new URL(href, baseURL).href;
    } else {
      // Relative URL
      url = new URL(href, new URL(pagePath, baseURL)).href;
    }

    // Skip external links in CI (can be flaky)
    if (url.startsWith("http") && !url.includes(new URL(baseURL).hostname) && process.env.CI) {
      continue;
    }

    try {
      const response = await request.get(url, {
        timeout: 10000,
        ignoreHTTPSErrors: true,
        maxRetries: 2,
      });

      results.push({
        url,
        status: response.status(),
        foundOn: pagePath,
        text: text.trim().slice(0, 50),
      });
    } catch (error) {
      results.push({
        url,
        status: 0,
        foundOn: pagePath,
        text: text.trim().slice(0, 50),
      });
    }
  }

  return results;
}

test.describe("Dead Link Detection", () => {
  for (const pagePath of PAGES_TO_CHECK) {
    test(`no dead links on ${pagePath}`, async ({ page, request, baseURL }) => {
      test.setTimeout(60000); // Increase timeout for link checking

      const results = await checkAllLinks(page, request, pagePath, baseURL!);

      const deadLinks = results.filter((r) => r.status >= 400 || r.status === 0);

      if (deadLinks.length > 0) {
        console.error(`\nDead links found on ${pagePath}:`);
        deadLinks.forEach((link) => {
          console.error(`  ❌ ${link.url} (${link.status}) - "${link.text}"`);
        });
      }

      expect(deadLinks, `Found ${deadLinks.length} dead links on ${pagePath}`).toHaveLength(0);
    });
  }
});
