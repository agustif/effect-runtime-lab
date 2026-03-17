import { collectStartup } from "./report.js"

for (const measurement of collectStartup()) {
  console.log(JSON.stringify(measurement, null, 2))
}
