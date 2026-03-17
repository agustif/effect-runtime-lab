# @effect-experimental/runtime-bench

Shared benchmarking and artifact-measurement package for runtime candidates.

## Current modules
- `index.ts` - artifact size, dependency inspection, temporary script creation, and command measurement helpers
- `artifacts.ts` - artifact and dependency report entrypoint
- `startup.ts` - basic runtime startup measurement entrypoint
- `snapshot.ts` - combined artifact/startup/warm-start snapshot writer

## Current CLI
- `pnpm --filter @effect-experimental/runtime-bench artifacts`
- `pnpm --filter @effect-experimental/runtime-bench startup`
- `pnpm --filter @effect-experimental/runtime-bench snapshot`

## Current evidence produced in this repo
- QuickJS native host artifact size on macOS
- QuickJS native host dynamic dependency list on macOS
- txiki runtime and compiled artifact size and dependency evidence when local artifacts are built
- basic startup wall-time and max resident set size evidence for QuickJS, txiki runtime, and txiki compiled samples when those binaries are available
- warm-start loop samples and RSS evidence when the host tooling supports it

## Generated outputs
- `docs/generated/runtime-bench.json`
- refresh via root `pnpm data:refresh`
- consumed by `docs/portfolio/scorecards/*.md` and `docs/portfolio/RELEASE_READINESS_CHECKPOINT.md`

`runtime-bench.json` is platform-scoped so it can be regenerated on macOS, Linux, and Windows with comparable fields.
`maxResidentSetKb` is normalized to kilobytes across macOS and Linux, even though `/usr/bin/time -l` reports raw byte counts on macOS.

```json
{
  "generatedAt": "2026-03-16T01:48:21.696Z",
  "platform": { "os": "darwin", "arch": "arm64", "node": "v22.4.0" },
  "artifacts": [
    {
      "path": "/path/to/effect-quickjs-host",
      "size": 1041248,
      "deps": ["..."],
      "depsSource": "otool",
      "platform": { "os": "darwin", "arch": "arm64", "node": "v22.4.0" }
    }
  ],
  "startup": [
    {
      "name": "quickjs-host",
      "wallTimeMs": 11.76,
      "maxResidentSetKb": 7127040,
      "rssSource": "time -l",
      "exitCode": 0,
      "stdout": "",
      "stderr": "..."
    }
  ],
  "warmStart": [
    {
      "name": "quickjs-host",
      "iterations": 5,
      "samplesMs": [11.1, 10.9, 11.0, 11.2, 10.8],
      "rssSamplesKb": [7127040, 7127040, 7127040, 7127040, 7127040],
      "rssSource": "time -l"
    }
  ]
}
```

## Purpose
This package owns the measurable evidence behind runtime scorecards. If a claim depends on size, startup, memory, or runtime dependencies, the proof should come from here.

## Task tracker

See `TASKS.md` for epics, nested subtasks, and remaining measurement gaps.
