---
workflow: b0.4
---

# Task: GitHub CI/CD for NPM Package Publishing

## Objective

Set up GitHub Actions CI/CD pipeline to publish the `@fozy-labs/js-configs` npm package automatically.

## Deliverables

1. **GitHub Actions workflow** (`.github/workflows/`) — CI/CD pipeline that:
   - Runs tests, lint, and type-checking on PRs and pushes.
   - Publishes the package to npm on release/tag events.
2. **Setup instructions** (`.mentall/cicd-setup.md`) — a user-facing guide (in Russian) covering:
   - GitHub repository secrets configuration (NPM_TOKEN, etc.).
   - npm access token creation and setup.
   - Workflow usage and triggering.

## Context

- Package: `@fozy-labs/js-configs` (scoped, public)
- Registry: npm (public)
- Build: `tsc` via `rimraf dist && tsc`
- Tests: `vitest run`
- Lint: `eslint src/`
- Format check: `prettier --check src/`
- Type check: `tsc --noEmit`
- Package manager: npm (inferred from package.json)
- Repository: `fozy-labs/js-configs` on GitHub
