# platform-quickjs v1 plan

## V1 target

Ship a careful QuickJS runtime adapter that covers the core Effect platform surface with:
- real package modules
- a native host build
- a production-style host-backed lane
- explicit support boundaries

## Verified now
- package structure and exports
- native host build and prod lane
- shared package-level conformance for `Path`, `FileSystem`, `Copy`, `FileHandle`, `Temp`, `Stdio`, `RuntimeMain`, `KeepAlive`, and `HttpClient`
- lazy host globals so bootstrap does not eagerly import every built-in module

## Still open for an honest v1 claim
- watch story
- richer real-host file-handle edge cases
- uploads and multipart
- artifact and dependency guarantees across platforms

## Batch alignment
The next execution batches are tracked in `../../docs/portfolio/NEXT_10_BATCHES.md`.
