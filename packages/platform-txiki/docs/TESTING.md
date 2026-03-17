# Testing

## Current test scope
- package export smoke coverage
- shared path contract checks via `runtime-conformance`
- shared filesystem subset, copy, file-handle, temp, stream/sink, chmod/link, and ordered watch contract helpers with mocked txiki host bindings
- shared stdio contract helper with mocked txiki streams
- shared runtime-main and keep-alive contract helpers with mocked txiki signal listeners
- fetch-backed HTTP client basic and timeout/abort-style advanced contract checks against a deterministic local server
- local redirect-follow HTTP test against the deterministic fixture
- shared upload contract checks against the deterministic fixture, including strict multipart boundary coverage
- shared HTTP error-mapping coverage against DNS, refused, TLS, malformed, and timeout stories
- explicit host assumption checks for txiki-specific globals

## Current evidence split

- package-level truth: verified through the Vitest suite with mocked txiki globals and deterministic HTTP fixtures
- runtime evidence: artifact, dependency, startup, and warm-start numbers come from `runtime-bench`
- a txiki-native prod lane currently passes for runtime, path, filesystem, HTTP, and watch slices

## Current verified commands
- `pnpm --filter @effect-experimental/platform-txiki build`
- `pnpm --filter @effect-experimental/platform-txiki test`
- `pnpm --filter @effect-experimental/platform-txiki check`
- `pnpm --filter @effect-experimental/platform-txiki test:prod`

## Still needed
- broader ownership and permission coverage under a real txiki host
- broader packaging guarantees beyond the current artifact and startup evidence
