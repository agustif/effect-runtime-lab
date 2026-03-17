import { collectCurated } from "./report.js"

const report = await collectCurated()
console.log(JSON.stringify(report, null, 2))

if (report.failed > 0) {
  process.exitCode = 1
}
