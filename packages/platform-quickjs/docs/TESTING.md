# Testing

## Current layers of evidence

### Package-level tests
- export smoke coverage
- shared path contract checks
- shared filesystem subset, copy, file-handle, temp, stream/sink, chmod/link, and watch contract checks with mocked host bindings
- shared upload contract checks with mocked host bindings
- shared stdio contract checks with mocked host bindings
- shared runtime-main and keep-alive contract checks with mocked host bindings
- package-level basic and timeout/abort-style HTTP client contract checks with mocked host bindings
- local redirect-follow test with mocked host bindings
- explicit QuickJS option-plumbing coverage for `follow`, `insecure`, `ca`, and timeout settings
- explicit host-missing behavior

### Host-backed prod lane
- runtime/bootstrap smoke
- filesystem smoke, including stream/sink, hard-link, chmod, closed-handle, and permission-mapping checks
- watch smoke
- path smoke
- HTTP client smoke with deterministic local fixture server
- redirect smoke
- timeout/abort smoke
- upload smoke, strict multipart boundary checks, and transport error mapping

## Current verified commands
- `pnpm --filter @effect-experimental/platform-quickjs build`
- `pnpm --filter @effect-experimental/platform-quickjs test`
- `pnpm --filter @effect-experimental/platform-quickjs check`
- `pnpm --filter @effect-experimental/platform-quickjs build:host`
- `pnpm --filter @effect-experimental/platform-quickjs test:prod`

## Still needed
- Linux and Windows host-proof runs matching the current macOS lane
- stronger recursive filesystem edge-case coverage beyond the current prod smokes
- broader cancellation and redirect matrix coverage
