import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Global Teardown for Playwright E2E Tests
 * - Cleanup temporary files
 * - Generate summary report
 */
export default async function globalTeardown() {
  console.log("Cleaning up E2E test environment...")
  
  // Cleanup any temporary auth states
  const authDir = path.join(__dirname, "..", ".auth")
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true })
  }
  
  console.log("E2E test cleanup complete")
}
