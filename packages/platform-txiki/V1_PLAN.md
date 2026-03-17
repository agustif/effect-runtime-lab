# platform-txiki v1 plan

## V1 target

Ship a careful txiki runtime adapter that covers the core Effect platform surface with real package modules and explicit support boundaries.

## Verified now
- package structure and exports
- shared package-level conformance for `Path`, `FileSystem`, `Copy`, `FileHandle`, `Temp`, `Watch`, `HttpClient`, `Redirect`, `Stdio`, `RuntimeMain`, and `KeepAlive`
- fetch-backed HTTP client
- substantial filesystem subset
- lazy stdin host lookup

## Still open for an honest v1 claim
- richer watch semantics
- richer file-handle edge cases
- uploads and multipart
- artifact, dependency, startup, and memory proofing from this repo

## Batch alignment
The next execution batches are tracked in `../../docs/portfolio/NEXT_10_BATCHES.md`.
