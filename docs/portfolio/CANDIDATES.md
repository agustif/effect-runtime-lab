# Candidate Runtimes

## quickjs-core
- smallest custom host path
- strongest control over deployability and dependency surface
- highest custom host maintenance burden

## txiki.js
- built on QuickJS-ng + libuv
- much richer runtime surface out of the box
- strong candidate for the richer experimental platform track
- local evaluation produced a 5.8M macOS executable with only system-library dependencies and a passing minimal Effect v4 smoke

## Deno / Bun
- broad-runtime comparators
- useful for separating runtime innovation from practical shipping leverage

## workerd / LLRT / Javy
- specialized labs only
- not default mainline candidates
