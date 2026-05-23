# @effect-experimental/cloudflare-sqlite-do

Thin env/layer bridge around `@effect/sql-sqlite-do`.

This package is intentionally narrow: it exposes the Durable Object SQLite storage binding as an
Effect layer and validates it with a runtime-backed Workers smoke test.
