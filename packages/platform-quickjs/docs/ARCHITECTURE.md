# Architecture

This package will own only the QuickJS platform adapter.

Planned layers:
- native host
- bundled runtime polyfills
- Effect platform services

Explicitly excluded from the package graph:
- REPL app code
- AI/chat tooling
- extension/plugin systems
- one-off development harnesses presented as public entrypoints
