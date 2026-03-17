# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD and automation.

## Workflows

### `ci.yml`
**Continuous Integration** - Runs on every push and PR

Jobs:
- **lint**: ESLint checks on the site package
- **build**: Builds all packages and runs type checking
- **test-unit**: Runs unit tests across all packages
- **test-e2e**: Runs Playwright E2E tests (Chromium only)
- **benchmarks**: Runs benchmarks on main branch pushes

### `pages.yml`
**GitHub Pages Deployment** - Deploys the site to GitHub Pages

Triggered on:
- Pushes to `main` or `master`
- Manual workflow dispatch

Requirements:
- GitHub Pages must be enabled in repository settings
- Source should be set to "GitHub Actions"

### `preview.yml`
**PR Preview** - Deploys preview builds for pull requests

Posts a comment on the PR with the preview URL.
Only runs for PRs from the same repository (not forks).

### `benchmarks.yml`
**Weekly Benchmarks** - Runs comprehensive benchmarks every Sunday

Generates and archives benchmark snapshots.

## Setup

### For GitHub Pages Deployment

1. Go to repository **Settings** → **Pages**
2. Under "Build and deployment", select **GitHub Actions** as the source
3. The site will be deployed automatically on each push to main

### Required Secrets

None required for basic operation. The workflows use:
- `GITHUB_TOKEN` (automatically provided)
- Standard GitHub Actions permissions

## Troubleshooting

### E2E tests failing

E2E tests require Playwright browsers to be installed:
```bash
pnpm --filter @effect-experimental/runtime-site e2e:install
```

### Benchmarks not running

Benchmarks only run on `main` branch pushes (not PRs) to avoid noisy data.

### Cache issues

If builds are failing due to cache corruption, manually clear the cache:
1. Go to **Actions** → **Caches**
2. Delete relevant cache entries
3. Re-run the workflow
