import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Global Setup for Playwright E2E Tests
 * - Ensures browsers are installed
 * - Creates test directories
 * - Sets up environment
 */
export default async function globalSetup() {
  console.log("Setting up E2E test environment...")
  
  // Ensure test results directory exists
  const testResultsDir = path.join(__dirname, "..", "test-results")
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true })
  }
  
  // Ensure playwright report directory exists
  const reportDir = path.join(__dirname, "..", "playwright-report")
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }
  
  // Check if Playwright browsers are installed
  try {
    execSync("npx playwright install chromium", { stdio: "inherit" })
  } catch (error) {
    console.warn("Could not install Playwright browsers automatically")
  }
  
  console.log("E2E test environment ready")
}
