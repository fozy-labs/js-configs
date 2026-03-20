---
title: "Implementation: GitHub CI/CD for NPM Package Publishing"
date: 2026-03-20
status: Approved
feature: "GitHub Actions CI/CD pipeline to publish @fozy-labs/js-configs to npm"
plan: "../03-plan/README.md"
rdpi-version: b0.4
---

## Status

- Phases completed: 2/2
- Verification: all passed (Phase 1: 23/23, Phase 2: 8/8)
- Issues: 1 (Low severity)

## Quality Review

### Checklist

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | All plan phases implemented | PASS | Phase 1 (4 tasks: ci.yml, publish.yml, dependabot.yml, package.json engines) and Phase 2 (1 task: cicd-setup.md) — all 5 tasks completed. |
| 2 | Verification passed for each phase | PASS | Phase 1: 23/23 checks passed. Phase 2: 8/8 checks passed. No failures. |
| 3 | No files outside plan scope modified | PASS | Only planned files created/modified: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `.github/dependabot.yml`, `package.json`, `.mentall/cicd-setup.md`. Note: `docs/CHANGELOG.md` appears in git working tree with an unrelated `[Unreleased]` section addition — this is a pre-existing change not part of this feature. |
| 4 | Code follows project patterns | PASS | YAML files follow standard GitHub Actions conventions. `package.json` field placement matches existing structure (`engines` after `sideEffects`, before `publishConfig`). Setup guide matches `.mentall/` convention (gitignored local docs). |
| 5 | Barrel exports updated correctly | N/A | No TypeScript source files created — only YAML, JSON field, and Markdown. No barrel exports affected. |
| 6 | TypeScript strict mode maintained | PASS | `npm run ts-check` passes after both phases. No TypeScript source files modified. |
| 7 | Documentation proportional to existing docs/demos | PASS | Existing docs: only `docs/CHANGELOG.md`. No `apps/demos/`. Added: single `.mentall/cicd-setup.md` (70 lines, gitignored). No changes to published documentation. Proportional. |
| 8 | No security vulnerabilities | PASS | Actions SHA-pinned (40-char SHAs). Minimal permissions (CI: `contents: read`; Publish: `contents: read` + `id-token: write`). No persistent secrets (OIDC). No `NODE_AUTH_TOKEN` in workflows. GitHub Environment required for publish. |

### Documentation Proportionality

Existing documentation footprint: `docs/CHANGELOG.md` only (~50 lines). No `apps/demos/` directory. The implementation adds a single `.mentall/cicd-setup.md` file (70 lines) which is gitignored — a local maintainer reference, not published documentation. No changes to `README.md`, `docs/CHANGELOG.md`, or any existing published documentation. This is proportional to the feature scope: CI/CD infrastructure needs a setup guide, but the guide stays local and concise. The 7-section structure covers exactly what's needed for first-time setup and ongoing release process.

### Issues Found

1. **Environment name deviation from design** — The design document (`01-architecture.md` §4) specifies `environment: npm`, but the implementation uses `environment: npm-publish`. The setup guide (`.mentall/cicd-setup.md`) correctly references `npm-publish` to match the actual workflow. The verification report accepted this as valid per prompt allowance. However, the trusted publisher configuration values in the setup guide (section 4) correctly reflect `npm-publish`, and the GitHub Environment instructions (section 5) also use `npm-publish` — so internal consistency is maintained within the implementation.
   - Where: `.github/workflows/publish.yml` line 14, `.mentall/cicd-setup.md` sections 4–5
   - Expected: `environment: npm` per design, actual: `environment: npm-publish`
   - Severity: **Low** — functionally equivalent; the environment name is a free-form string that must match between: (1) `publish.yml`, (2) npm trusted publisher config, and (3) GitHub Environment settings. All three are consistently `npm-publish` in the implementation and guide.

## Post-Implementation Recommendations

- [ ] Full build: `npm run build`
- [ ] Full test run: `npm run test`
- [ ] Manual testing: push a test PR to verify CI workflow triggers and reports status
- [ ] Manual testing: after first manual publish and OIDC setup per `.mentall/cicd-setup.md`, push a version tag to verify the full CI → Publish chain
- [ ] Verify YAML syntax in GitHub Actions tab after push (no syntax errors)
- [ ] Create GitHub Environment `npm-publish` in repository settings before first automated publish

## Change Summary

- **`.github/workflows/ci.yml`** (created) — CI workflow: triggers on push to main/tags and PRs; runs ts-check, format:check, lint, test; SHA-pinned actions (checkout, setup-node v4); Node 22.x with npm cache; permissions: contents read
- **`.github/workflows/publish.yml`** (created) — Publish workflow: triggers via `workflow_run` on CI completion; gated by success + tag condition; checkout at `head_sha`; setup-node with registry-url; `npm publish --provenance --access public`; OIDC auth (no TOKEN); SHA-pinned actions; permissions: contents read + id-token write; environment: npm-publish
- **`.github/dependabot.yml`** (created) — Dependabot configuration for weekly GitHub Actions SHA-pin updates; `github-actions` ecosystem only
- **`package.json`** (modified) — Added `engines` field: `"node": ">=22.0.0"` after `sideEffects`, before `publishConfig`
- **`.mentall/cicd-setup.md`** (created) — CI/CD setup guide in Russian (70 lines, gitignored); 7 sections: prerequisites, granular token creation, first publish, OIDC trusted publisher setup, GitHub Environment setup, release process, troubleshooting; links to official npm and GitHub docs

## Recommended Commit Message

```
ci: add GitHub Actions CI/CD pipeline for npm publishing

- Add CI workflow (ci.yml): ts-check, format, lint, test on PRs and pushes
- Add Publish workflow (publish.yml): npm publish with OIDC and provenance
- Add Dependabot config for GitHub Actions SHA-pin updates
- Add engines field (node >=22.0.0) to package.json
- Add local CI/CD setup guide (.mentall/cicd-setup.md)
```
