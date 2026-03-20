---
title: "CI/CD Pipeline Risk Analysis"
date: 2026-03-20
stage: 02-design
role: rdpi-qa-designer
workflow: b0.4
---

# CI/CD Pipeline Risk Analysis

## Risk Matrix

| ID | Risk | Probability | Impact | Strategy | Mitigation |
|----|------|-------------|--------|----------|------------|
| R01 | OIDC trusted publisher misconfiguration | Medium | High | Mitigate | Exact match required for repo, workflow name, environment. Verify configuration step-by-step per UC-4 [ref: ./05-usecases.md#uc-4] |
| R02 | First publish failure (chicken-and-egg) | Medium | High | Mitigate | Package must exist on npm before OIDC can be configured. Follow manual first-publish procedure with granular token [ref: ./02-dataflow.md#4-first-publish-flow-one-time-setup] |
| R03 | Publishing broken package to npm | Low | High | Mitigate | CI runs all checks before publish via `workflow_run` chain; `conclusion == 'success'` gate prevents publish if any check fails [ref: ./01-architecture.md#4-publish-workflow-publishyml] |
| R04 | Duplicate version publish (version conflict) | Low | Medium | Accept | npm rejects duplicate versions with 403. Developer must bump to a new version. No partial publish risk — npm publish is atomic |
| R05 | Supply chain attack via compromised action | Low | High | Mitigate | All actions SHA-pinned per ADR-5 [ref: ./04-decisions.md#adr-5]; Dependabot updates SHAs via PR with review |
| R06 | Secrets leakage in workflow logs | Low | High | Mitigate | No persistent secrets stored (OIDC eliminates npm tokens); GitHub automatically masks secrets in logs; permissions are minimal |
| R07 | Tag push from wrong branch | Medium | Medium | Accept | No automated branch filter on tag pushes. Mitigated by maintainer discipline and documentation [ref: ./05-usecases.md#uc-3] |
| R08 | npm registry outage during publish | Low | Medium | Accept | Publish fails cleanly; re-run by deleting and re-pushing the tag. npm has 99.9%+ uptime |
| R09 | GitHub Actions outage | Low | Medium | Accept | No workaround — wait for service restoration. Does not affect already-published packages |
| R10 | Node.js version incompatibility (npm CLI) | Low | High | Mitigate | Trusted publishing requires npm CLI 11.5.1+ / Node 22.14.0+. Pinned to `22.x` in workflows; `engines` field enforces >=22.0.0 [ref: ./04-decisions.md#adr-4] |
| R11 | `workflow_run` context mismatch | Medium | High | Mitigate | `workflow_run` runs in default branch context. Must use `head_sha` for checkout and `head_branch` for tag detection [ref: ./01-architecture.md#workflow_run-context-considerations] |
| R12 | Forgetting `--follow-tags` on push | Medium | Low | Accept | Only commit pushes, no tag → no publish triggers. Developer pushes tag separately with `git push --tags`. Documented in setup guide [ref: ./07-docs.md] |
| R13 | Cache corruption causing CI failures | Low | Low | Accept | `setup-node` cache is based on lockfile hash. Cache miss falls back to fresh install — slower but functional |
| R14 | Dependabot PR breaks CI | Low | Low | Accept | Dependabot PRs run CI checks; breaking changes caught before merge. SHA updates for actions are low-risk |
| R15 | `repository` field mismatch in package.json | Low | High | Mitigate | Case-sensitive match required for provenance. Currently set correctly [ref: ../01-research/01-codebase-analysis.md#4-package-metadata]; must not be changed without verifying provenance impact |
| R16 | GitHub Environment `npm` not created | Medium | High | Mitigate | Without environment, OIDC token lacks environment claim → npm rejects authentication. Covered in first-publish checklist [ref: ./05-usecases.md#uc-4] |
| R17 | Permission escalation in workflow files | Low | High | Mitigate | Permissions set per-workflow (not default); CI has only `contents: read`; publish has `contents: read` + `id-token: write`. CODEOWNERS for `.github/workflows/` recommended |
| R18 | Concurrent tag pushes | Low | Low | Accept | npm rejects duplicate version publish. Second publish fails with 403. Not a practical concern for solo/small team |

## Detailed Mitigation Plans

### R01: OIDC Trusted Publisher Misconfiguration

Trusted publishing requires an **exact, case-sensitive match** across three fields: repository name (`fozy-labs/js-configs`), workflow filename (`publish.yml`), and environment name (`npm`) [ref: ../01-research/02-external-research.md#pitfalls]. A mismatch in any field causes OIDC token rejection with an opaque error.

**Mitigation steps:**
1. Follow UC-4 setup checklist sequentially — configure npm trusted publisher *after* successful first manual publish, copying exact repo/workflow/environment values.
2. After configuration, perform a test release (e.g., `npm version patch`) to validate the full OIDC chain end-to-end before relying on it for real releases.
3. Document the exact trusted publisher values in the setup guide (`.mentall/cicd-setup.md`) so they can be verified against actual configuration if issues arise.

**Verification**: T09 (OIDC auth works), T22 (first CI publish succeeds).

### R02: First Publish Failure

The first publish of `@fozy-labs/js-configs` cannot use OIDC — the package must exist on npm before trusted publishing can be configured [ref: ../01-research/02-external-research.md#pitfalls]. This one-time step uses a temporary granular access token and is performed outside CI.

**Mitigation steps:**
1. Create a short-lived (7-day) granular access token scoped to `@fozy-labs` with read-write permissions.
2. Publish manually from local machine: `npm ci && npm run build && npm publish --access public`.
3. Immediately configure trusted publisher on npm and create GitHub Environment `npm`, then revoke the granular token.

**Verification**: UC-4 procedure in use cases [ref: ./05-usecases.md#uc-4]. Success = package visible on npmjs.com.

### R03: Publishing Broken Package

If a tagged commit has broken code, it could be published to npm. The `workflow_run` chain with `conclusion == 'success'` condition prevents this — publish only runs if CI passed all checks (ts-check, format, lint, test) [ref: ./01-architecture.md#job-condition].

**Mitigation steps:**
1. The `workflow_run` condition `conclusion == 'success'` is the primary gate — CI must pass before publish runs.
2. Maintainer should always verify `main` is green before running `npm version` — the release process starts from a known-good state.
3. If a broken package is accidentally published, `npm unpublish @fozy-labs/js-configs@<version>` within 72 hours, or publish a fixed patch version immediately.

**Verification**: T17 (publish skipped on CI failure), T03-T04 (CI runs on tag push and passes).

### R05: Supply Chain Attack via Compromised Action

A compromised GitHub Action could exfiltrate secrets or inject malicious code. SHA pinning ensures that the exact audited code is used, regardless of tag mutations [ref: ./04-decisions.md#adr-5].

**Mitigation steps:**
1. All actions pinned to full-length commit SHA with version comment (e.g., `actions/checkout@<sha> # v4.2.2`).
2. Dependabot configured to submit PRs for SHA updates weekly — maintainer reviews the diff and changelog before merging.
3. Only `actions/checkout` and `actions/setup-node` (both maintained by GitHub) are used — minimal third-party attack surface.

**Verification**: T27 (SHA pinning in workflow files), T30 (Dependabot configured).

### R06: Secrets Leakage in Workflow Logs

Exposed credentials could allow unauthorized package publishing or repository access.

**Mitigation steps:**
1. OIDC eliminates persistent npm tokens entirely — no `NODE_AUTH_TOKEN` secret stored in GitHub [ref: ./04-decisions.md#adr-1]. Short-lived OIDC tokens expire within minutes.
2. GitHub automatically masks registered secrets in workflow logs. Since no npm secrets exist, there is nothing to leak.
3. Permissions are set to minimum required per workflow — CI has no write access; publish has only `id-token: write` for OIDC.

**Verification**: T25-T26 (permission audit), T28 (log inspection).

### R10: Node.js Version Incompatibility

Trusted publishing requires npm CLI 11.5.1+ which ships with Node 22.14.0+ [ref: ../01-research/02-external-research.md#2-authentication-methods]. Using an older Node.js version would silently break OIDC authentication.

**Mitigation steps:**
1. Both workflows pin `node-version: '22.x'` — this resolves to the latest 22.x patch (currently 22.14.0+), which includes a compatible npm CLI version.
2. `engines` field in `package.json` declares `"node": ">=22.0.0"` [ref: ./04-decisions.md#adr-7], serving as documentation of the minimum version.
3. If Node 22.x is ever removed from `actions/setup-node` (after April 2027 EOL), the workflow will fail loudly — forcing an update to Node 24.x+.

**Verification**: T09 (OIDC works), T11 (build succeeds with correct Node version).

### R11: `workflow_run` Context Mismatch

In `workflow_run` context, `github.sha` and `github.ref` refer to the default branch (main), not the tagged commit [ref: ./01-architecture.md#workflow_run-context-considerations]. Using the wrong ref would build and publish code from `main` HEAD instead of the tagged version.

**Mitigation steps:**
1. Checkout step must explicitly use `ref: ${{ github.event.workflow_run.head_sha }}` — the SHA of the commit that triggered the original CI run.
2. Tag detection uses `github.event.workflow_run.head_branch` in the job condition (`startsWith(head_branch, 'v')`).
3. Code review of `publish.yml` must verify these fields are used correctly — this is the most subtle correctness requirement in the pipeline.

**Verification**: T08 (correct commit checked out).

### R15: `repository` Field Mismatch in package.json

npm provenance requires the `repository` field in `package.json` to case-sensitively match the actual GitHub repository URL [ref: ../01-research/02-external-research.md#pitfalls]. Currently set to `git+https://github.com/fozy-labs/js-configs.git` which is correct.

**Mitigation steps:**
1. Do not modify the `repository` field in `package.json` without verifying provenance compatibility.
2. If the repository is ever renamed or transferred, update `repository` field and re-verify provenance generation.

**Verification**: T10 (provenance badge appears on npmjs.com).

### R16: GitHub Environment `npm` Not Created

The publish workflow uses `environment: npm`. If this environment doesn't exist in GitHub repository settings, the OIDC token won't include the environment claim, and npm will reject the authentication [ref: ./05-usecases.md#uc-4].

**Mitigation steps:**
1. Environment creation is an explicit step in the first-publish checklist (UC-4 step 4).
2. The setup guide documents this requirement with a direct link to GitHub repository settings.
3. Failure mode is clear — publish job fails at the OIDC step with an authentication error, not a silent mismatch.

**Verification**: T29 (environment required in publish job), T22 (first CI publish succeeds end-to-end).

### R17: Permission Escalation in Workflow Files

A malicious or careless PR could modify workflow files to add excessive permissions (e.g., `contents: write`, `packages: write`), potentially enabling supply chain attacks.

**Mitigation steps:**
1. Workflow files set permissions explicitly at the workflow level — no reliance on repository defaults.
2. Consider adding a CODEOWNERS file requiring review for `.github/workflows/` changes [ref: ../01-research/02-external-research.md#7-security-best-practices].
3. SHA-pinned actions limit what third-party code can do even with elevated permissions.

**Verification**: T25-T26 (permission audit of both workflow files).
