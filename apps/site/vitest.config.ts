import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

/**
 * Vitest Configuration for Unit and Integration Tests
 * - React support
 * - Coverage reporting
 * - UI mode for debugging
 */
export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    environment: "jsdom",
    
    // Test file patterns
    include: [
      "src/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
    ],
    
    // Exclude patterns
    exclude: [
      "node_modules",
      "dist",
      ".next",
      "e2e/**/*", // E2E tests handled by Playwright
    ],
    
    // Global test setup
    globals: true,
    
    // Setup files
    setupFiles: ["./vitest.setup.ts"],
    
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "./coverage",
      include: [
        "app/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "src/**/*.{ts,tsx}",
      ],
      exclude: [
        "node_modules",
        "dist",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/types.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Enable UI mode
    ui: true,
    
    // Reporter
    reporters: ["verbose", "html"],
    
    // Output file for JSON reporter
    outputFile: "./vitest-report/results.json",
  },
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@/app": path.resolve(__dirname, "./app"),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/components": path.resolve(__dirname, "./components"),
    },
  },
})
