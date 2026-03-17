import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..", "..", "..")
const generatedDir = path.join(repoRoot, "docs", "generated")
const docsDir = path.join(repoRoot, "docs")
const packagesDir = path.join(repoRoot, "packages")

const readJson = (relativePath) => {
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(repoRoot, relativePath)
  if (!fs.existsSync(absolutePath)) return null
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"))
  } catch {
    return null
  }
}

const readMarkdown = (relativePath) => {
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(repoRoot, relativePath)
  if (!fs.existsSync(absolutePath)) return null
  return fs.readFileSync(absolutePath, "utf8")
}

export const loadRuntimeBench = () =>
  readJson(path.join(generatedDir, "runtime-bench.json"))

export const loadEffectCoreConformance = () =>
  readJson(path.join(generatedDir, "effect-core-conformance.json"))

export const loadSupportMatrix = (runtime) => {
  const mapped = runtime === "quickjs"
    ? path.join(packagesDir, "platform-quickjs", "docs", "SUPPORT_MATRIX.md")
    : path.join(packagesDir, "platform-txiki", "docs", "SUPPORT_MATRIX.md")
  return readMarkdown(mapped)
}

export const loadScorecard = (runtime) => {
  const mapped = runtime === "quickjs"
    ? path.join(docsDir, "portfolio", "scorecards", "quickjs-core.md")
    : path.join(docsDir, "portfolio", "scorecards", "platform-txiki.md")
  return readMarkdown(mapped)
}

export const loadRoadmap = () =>
  readMarkdown(path.join(docsDir, "portfolio", "NEXT_10_BATCHES.md"))

export const loadRuntimeReadme = (runtime) => {
  const mapped = runtime === "quickjs"
    ? path.join(packagesDir, "platform-quickjs", "README.md")
    : path.join(packagesDir, "platform-txiki", "README.md")
  return readMarkdown(mapped)
}

export const repoMetadata = () => ({
  repoRoot,
  generatedDir
})
