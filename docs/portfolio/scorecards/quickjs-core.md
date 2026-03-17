# quickjs-core scorecard

## Current evidence
- native host build passes in this repo
- production-style host-backed lane passes in this repo, including watch, upload, stream/sink, hard-link, chmod, closed-handle, and permission-mapping coverage
- package-level build, test, and typecheck pass in this repo
- root `pnpm test` now includes the 30-case curated `effect-core-conformance` lane and it currently passes cleanly
- current local host artifact report: 1,041,280 bytes on macOS
- current local macOS dependencies: `/usr/lib/libSystem.B.dylib`, `/usr/lib/libcurl.4.dylib`
- latest local startup measurement: about 12.15ms wall time and 6,976KB max resident set size
- current local warm-start range: about 10.71ms to 14.50ms with 6,944KB to 7,008KB max resident set size
- package-level support includes stream/sink, chmod/link, rename/nested/churn watch semantics, redirect-follow, option plumbing, transport error mapping, and upload coverage including stream-body and multipart depth

## Current strengths
- a strong candidate for the tiny deployable runtime track
- explicit host boundary and dependency story
- easier to reason about bootstrap behavior
- host-backed evidence beyond plain smoke

## Current open questions
- Linux and Windows host-proof runs are still missing
- stronger distribution guarantees beyond the current local macOS proof are still missing
- the remaining recursive filesystem and broader redirect or cancellation matrix are still not exhaustively covered
