# Candidate runtimes

## quickjs-core
- smallest custom host path we know of today
- strong control over deployability and dependency surface
- higher maintenance burden because the host is ours
- backed by a native host build and a production-style lane in this repo

## platform-txiki / txiki.js
- built on QuickJS-ng + libuv
- a richer runtime surface out of the box
- likely the best near-term fit for a richer experimental track
- good fit for a web-platform-heavy adapter: `console`, `Path`, `Stdio`, `HttpClient`, runtime/bootstrap helpers, and a substantial filesystem subset
- local evaluation produced a ~5.8M macOS executable with only system-library dependencies and a passing minimal Effect v4 smoke

## Deno / Bun
- future broad-runtime comparators
- useful for separating runtime innovation from practical shipping leverage

## workerd / LLRT / Javy
- specialized labs only
- not current mainline candidates
