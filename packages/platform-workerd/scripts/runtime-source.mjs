import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import * as Schema from "effect/Schema";

const execFileAsync = promisify(execFile);

const SourceConfig = Schema.Struct({
  generatedTypesPath: Schema.String,
  workersTypesVersion: Schema.String,
  wranglerConfigPath: Schema.String,
});

const decodeSourceConfig = Schema.decodeUnknownSync(SourceConfig);

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const loadSourceConfig = async () => {
  const sourceConfig = await readJson(new URL("../source/runtime-source.json", import.meta.url));
  return decodeSourceConfig(sourceConfig);
};

const loadPackageJson = async () => {
  return readJson(new URL("../package.json", import.meta.url));
};

const assertPinnedWorkersTypesVersion = async (expectedVersion) => {
  const packageJson = await loadPackageJson();
  const actualVersion = packageJson.devDependencies?.["@cloudflare/workers-types"];
  if (actualVersion !== expectedVersion) {
    throw new Error(
      `Pinned @cloudflare/workers-types mismatch: expected ${expectedVersion}, found ${actualVersion}`,
    );
  }
};

const runWranglerTypes = async (configPath, generatedTypesPath, extraArgs = []) => {
  await execFileAsync(
    "npx",
    ["wrangler", "types", generatedTypesPath, "--config", configPath, ...extraArgs],
    {
      cwd: new URL("..", import.meta.url),
      env: process.env,
    },
  );
};

const main = async () => {
  const mode = process.argv[2];
  if (mode !== "generate" && mode !== "check") {
    throw new Error(`Unknown mode: ${mode ?? "<missing>"}. Expected "generate" or "check".`);
  }

  const sourceConfig = await loadSourceConfig();
  await assertPinnedWorkersTypesVersion(sourceConfig.workersTypesVersion);

  await runWranglerTypes(
    sourceConfig.wranglerConfigPath,
    sourceConfig.generatedTypesPath,
    mode === "check" ? ["--check"] : [],
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
