# @effect-experimental/runtime-conformance

Shared, executable contract helpers for runtime candidates.

## Current modules
- `PathContract.verifyBasicPathLayer` - basic path-function sanity (`sep`, `basename`, `dirname`, `extname`, `join`, `normalize`, `resolve`)
- `FileSystemContract.verifyBasicFileSystemLayer` - shallow filesystem subset checks (create, write, read, rename, stat, remove, `realPath`, `readDirectory`)
- `CopyContract.verifyBasicCopyLayer` - basic `copyFile` and recursive `copy` checks
- `FileHandleContract.verifyBasicFileHandleLayer` - package-level file-handle sanity (open, cursor, append, overwrite, truncate)
- `FileHandleContract.verifyAdvancedFileHandleLayer` - richer seek/append/truncate combinations for file handles
- `FileHandleContract.verifyHostFileHandleLayer` - host-backed file-handle checks (sync, closed-handle errors, permission mapping)
- `TempContract.verifyBasicTempLayer` - temp directory and temp file checks, including scoped cleanup
- `WatchContract.verifyBasicWatchLayer` / `verifyWatchSequenceLayer` / `verifyWatchSubsequenceLayer` - basic, ordered, and subsequence watch helpers
- `WatchContract.verifyWatchChurnLayer` - watch churn helper for rapid create/update/remove bursts
- `WatchContract.verifyWatchRenameLayer` - rename helper (expects remove/create for renamed path)
- `RedirectContract.verifyRedirectHttpClientLayer` - shared local redirect-follow contract helper
- `UploadContract.verifyBasicUploadHttpClientLayer` - shared byte-upload, stream-body upload, and multipart-form upload contract helper
- `UploadContract.verifyAdvancedUploadHttpClientLayer` - deeper stream and multipart coverage (multi-file, missing content-length, large stream)
- `UploadContract.verifyStrictUploadHttpClientLayer` - host-backed multipart boundary/error coverage
- `HttpClientContract.verifyBasicHttpClientLayer` - deterministic HTTP fixture exercises covering JSON, binary, cookies, and streams
- `HttpClientContract.verifyAdvancedHttpClientLayer` - timeout/abort-style behavior plus invalid JSON, HEAD/status, and JSON echo checks
- `HttpClientContract.verifyHttpErrorMappingLayer` - host-backed transport error mapping (DNS, connection refused, TLS, timeout, malformed)
- `KeepAliveContract.verifyKeepAliveRuntimeMain` - upstream-derived keep-alive semantics for `runMain`
- `StdioContract.verifyBasicStdioLayer` - shared args/stdout/stderr/stdin contract helper
- `RuntimeMainContract.verifyBasicRuntimeMain` - shared `runMain` contract helper for success, failure, and interrupt teardown
- `HttpFixture` - in-process server for deterministic HTTP response stories

## Usage

Each runtime package should consume these helpers instead of inventing a private contract story. Use the package-level helpers in mocked or pure-JS harnesses, and the host-backed helpers when the native runtime is available.

```ts
await PathContract.verifyBasicPathLayer(QuickJSPath.layer)
await FileSystemContract.verifyBasicFileSystemLayer(QuickJSFileSystem.layer)
await CopyContract.verifyBasicCopyLayer(QuickJSFileSystem.layer, {
  directory: "/tmp",
  sourceFileName: "source.txt",
  copiedFileName: "copy.txt",
  nestedDirectoryName: "nested",
  nestedFileName: "inside.txt",
  copiedDirectoryName: "nested-copy"
})
await FileHandleContract.verifyBasicFileHandleLayer(QuickJSFileSystem.layer, { directory: "/tmp", fileName: "handle.txt" })
await FileHandleContract.verifyAdvancedFileHandleLayer(QuickJSFileSystem.layer, { directory: "/tmp", fileName: "handle.txt" })
await FileHandleContract.verifyHostFileHandleLayer(QuickJSFileSystem.layer, {
  directory: "/tmp",
  fileName: "handle.txt",
  permissionDeniedPath: "/tmp/permission-denied.txt"
})
await TempContract.verifyBasicTempLayer(TxikiFileSystem.layer)
await WatchContract.verifyWatchSequenceLayer(TxikiFileSystem.layer, "/watched", [
  { _tag: "Update", path: "/watched/watched.txt" },
  { _tag: "Update", path: "/watched/watched-again.txt" }
])
await WatchContract.verifyWatchChurnLayer(TxikiFileSystem.layer, "/watched", [
  { _tag: "Create", path: "/watched/watched.txt" },
  { _tag: "Remove", path: "/watched/watched.txt" }
])
await WatchContract.verifyWatchRenameLayer(TxikiFileSystem.layer, "/watched", "/watched/old.txt", "/watched/new.txt")
await RedirectContract.verifyRedirectHttpClientLayer(TxikiHttpClient.layer, "http://fixture")
await StdioContract.verifyBasicStdioLayer(QuickJSStdio.layer, { expectedArgs: ["a"] })
await RuntimeMainContract.verifyBasicRuntimeMain(makeHarness)
await KeepAliveContract.verifyKeepAliveRuntimeMain(makeHarness)
await HttpClientContract.verifyBasicHttpClientLayer(QuickJSHttpClient.layer, "http://fixture")
await HttpClientContract.verifyAdvancedHttpClientLayer(TxikiHttpClient.layer, "http://fixture")
await HttpClientContract.verifyHttpErrorMappingLayer(QuickJSHttpClient.layer, "http://fixture", {
  configureTimeout: (client) => client.pipe(QuickJSHttpClient.withOptions({ timeoutSeconds: 0.01 }))
})
await UploadContract.verifyStrictUploadHttpClientLayer(TxikiHttpClient.layer, "http://fixture")
```

## Validation

```sh
pnpm --filter @effect-experimental/runtime-conformance build
pnpm --filter @effect-experimental/runtime-conformance check
```

## Task tracker

See `TASKS.md` for epics, nested subtasks, and rollout state.
