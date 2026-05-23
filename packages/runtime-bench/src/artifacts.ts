import { collectArtifacts } from "./report.js";

for (const artifact of collectArtifacts()) {
  console.log(JSON.stringify(artifact, null, 2));
}
