import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Playwright E2E Configuration
 * - Cross-browser testing (Chromium, Firefox, WebKit)
 * - Mobile viewport testing
 * - Auto-starts dev server
 * - HTML and JSON reporting
 * - Screenshot and video capture on failure
 */
export default defineConfig({
  testDir: "./e2e",
  
  // Run all tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    ["json", { outputFile: "playwright-report/results.json" }],
    process.env.CI ? ["github"] : ["line"],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for all pages
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    
    // Collect trace on first retry
    trace: "on-first-retry",
    
    // Screenshot on failure
    screenshot: "only-on-failure",
    
    // Video on failure
    video: "retain-on-failure",
    
    // Action timeout
    actionTimeout: 15000,
    
    // Navigation timeout
    navigationTimeout: 15000,
  },
  
  // Configure projects for major browsers
  projects: [
    // Setup project for authentication if needed
    { 
      name: "setup", 
      testMatch: /.*\.setup\.ts/ 
    },
    
    // Desktop browsers
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 }
      },
      dependencies: ["setup"],
    },
    
    {
      name: "firefox",
      use: { 
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 720 }
      },
      dependencies: ["setup"],
    },
    
    {
      name: "webkit",
      use: { 
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 720 }
      },
      dependencies: ["setup"],
    },
    
    // Mobile browsers
    {
      name: "mobile-chrome",
      use: { 
        ...devices["Pixel 5"] 
      },
      dependencies: ["setup"],
    },
    
    {
      name: "mobile-safari",
      use: { 
        ...devices["iPhone 12"] 
      },
      dependencies: ["setup"],
    },
    
    // Tablet
    {
      name: "tablet-chrome",
      use: { 
        ...devices["iPad (gen 7)"] 
      },
      dependencies: ["setup"],
    },
  ],
  
  // Run local dev server before starting tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // Output directory for test artifacts
  outputDir: "test-results",
  
  // Global setup/teardown
  globalSetup: path.join(__dirname, "e2e", "global-setup.ts"),
  globalTeardown: path.join(__dirname, "e2e", "global-teardown.ts"),
})
