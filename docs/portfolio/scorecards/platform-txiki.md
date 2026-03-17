# platform-txiki scorecard

## Current evidence
- package-level build, test, and typecheck pass in this repo
- root `pnpm test` now includes the 30-case curated `effect-core-conformance` lane and it currently passes cleanly
- a txiki-native prod lane now passes for runtime, path, filesystem, HTTP, and watch slices
- local txiki runtime artifact: about 6.07MB on macOS
- local txiki compiled sample artifact: about 6.07MB on macOS
- current local macOS dependencies: `/usr/lib/libffi.dylib`, `/usr/lib/libSystem.B.dylib`, `/usr/lib/libc++.1.dylib`
- latest local startup measurement: about 16.46ms wall time and 5,600KB max resident set size for the runtime, and about 14.37ms plus 5,408KB for the compiled sample
- current local warm-start range: runtime about 13.79ms to 17.90ms with 5,568KB to 5,584KB RSS; compiled sample about 15.15ms to 30.02ms with 5,392KB to 5,424KB RSS
- package-level support includes stream/sink, chmod/link, rename/nested/churn watch semantics, redirect-follow, transport error mapping, and upload coverage including stream-body and multipart depth

## Current strengths
- richer runtime surface than the custom QuickJS host
- straightforward fetch-backed `HttpClient`
- substantial async filesystem subset can be implemented directly against txiki primitives
- less pressure to reinvent web-standard APIs
- local artifact and startup evidence now exists in this repo

## Current open questions
- broader deployment guarantees beyond local proof are still missing
- ownership, permission, and recursive-cleanup coverage under a real txiki host are still missing
