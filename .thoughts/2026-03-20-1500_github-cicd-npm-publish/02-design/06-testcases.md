---
title: "CI/CD Pipeline Test Strategy"
date: 2026-03-20
stage: 02-design
role: rdpi-qa-designer
workflow: b0.4
---

# CI/CD Pipeline Test Strategy

## Approach

CI/CD workflows are infrastructure-as-code — they cannot be unit-tested in the traditional sense. The verification strategy is:

1. **Manual verification checklist** — primary approach. Each test case is verified by a human during initial deployment and after significant changes. This is standard practice for CI/CD pipelines [ref: ./01-architecture.md].
2. **Observational verification** — after first real PR, merge, and release, confirm that workflows behave as designed by inspecting GitHub Actions logs, npm registry, and provenance badges.
3. **YAML linting** — static validation of workflow syntax before push (optional, via `actionlint` locally).

No automated tests for workflows are planned — the cost-benefit ratio is unfavorable for a project of this scale. The existing test suite (`vitest run`) validates the package itself; the CI pipeline merely *runs* those tests.

### Acceptance Criteria by Category

| Category | Acceptance Criteria |
|----------|-------------------|
| CI Workflow | All 4 checks (ts-check, format:check, lint, test) run and report status on every PR and push to main |
| Publish Workflow | Tag push triggers publish only after CI passes; package appears on npm with provenance badge |
| Negative Cases | Failing code blocks PR merge; publish never fires without successful CI on a tag |
| Security | No secrets in logs; permissions are minimal; actions are SHA-pinned |

## Test Cases

| ID | Category | Description | Input / Trigger | Expected Output | Priority |
|----|----------|-------------|-----------------|-----------------|----------|
| T01 | CI Workflow | CI triggers on PR to main | Open PR targeting `main` | CI workflow starts; all 4 steps run sequentially | High |
| T02 | CI Workflow | CI triggers on push to main | Merge PR into `main` (or direct push) | CI workflow starts; status reported on commit | High |
| T03 | CI Workflow | CI triggers on tag push | `git push --follow-tags` with `v*` tag | CI workflow starts for the tag ref | High |
| T04 | CI Workflow | All checks pass on valid code | PR with code that passes ts-check, format, lint, test | Green checkmark on PR; all 4 steps show success | High |
| T05 | CI Workflow | npm cache is used on second run | Two consecutive CI runs without lockfile changes | Second run shows "Cache restored" in setup-node step | Low |
| T06 | CI Workflow | Steps run in correct order | Any CI trigger | Logs show: checkout → setup-node → npm ci → ts-check → format:check → lint → test | Medium |
| T07 | Publish Workflow | Publish triggers after CI on tag push | Push `v*` tag → CI completes successfully | `workflow_run` fires; publish job starts with condition met | High |
| T08 | Publish Workflow | Publish uses correct commit | Push tag `v1.0.1` | Checkout step uses `github.event.workflow_run.head_sha` (the tagged commit, not main HEAD) | High |
| T09 | Publish Workflow | OIDC authentication works | Publish job runs in `npm` environment | No `NODE_AUTH_TOKEN` secret needed; npm CLI auto-detects OIDC; publish succeeds | High |
| T10 | Publish Workflow | Provenance badge appears | Successful publish with `--provenance` | Package page on npmjs.com shows provenance badge; `npm audit signatures` passes | High |
| T11 | Publish Workflow | Build runs before publish | Publish workflow executes | `npm run build` step produces `dist/` directory before `npm publish` | High |
| T12 | Publish Workflow | Package accessible after publish | Successful publish of `v1.0.1` | `npm install @fozy-labs/js-configs@1.0.1` works | High |
| T13 | Negative Cases | Failing tests block PR | PR with a failing test | CI reports red X; PR checks show failure at test step | High |
| T14 | Negative Cases | Lint failure blocks PR | PR with lint errors | CI reports failure at lint step; subsequent steps skipped | High |
| T15 | Negative Cases | Type-check failure blocks PR | PR with TypeScript errors | CI reports failure at ts-check step | Medium |
| T16 | Negative Cases | Format failure blocks PR | PR with unformatted code | CI reports failure at format:check step | Medium |
| T17 | Negative Cases | Publish skipped when CI fails on tag | Tag push where CI checks fail | Publish workflow fires but job condition (`conclusion == 'success'`) is false → job skipped | High |
| T18 | Negative Cases | Publish does not trigger on main push | Push to `main` (no tag) → CI completes | Publish workflow fires but `startsWith(head_branch, 'v')` is false → job skipped | High |
| T19 | Negative Cases | Publish does not trigger on PR | PR opened and CI completes | Publish workflow does NOT fire (workflow_run only watches push-triggered CI) | Medium |
| T20 | Negative Cases | Duplicate version publish fails gracefully | Push tag for already-published version | `npm publish` returns 403 "version already exists"; workflow fails with clear error | Medium |
| T21 | Edge Cases | Concurrent CI runs on push + tag | `git push --follow-tags` sends both branch push and tag push | Two CI runs start (one for main push, one for tag); only tag-triggered CI leads to publish | Medium |
| T22 | Edge Cases | First publish via CI (after manual setup) | First tag push after OIDC trusted publisher configured | Publish succeeds; proves OIDC chain works end-to-end | High |
| T23 | Edge Cases | `npm ci` fails on lockfile mismatch | Push with `package.json` changed but `package-lock.json` not updated | CI fails at `npm ci` step; all subsequent steps skipped | Low |
| T24 | Edge Cases | Dependabot PR for action update | Dependabot opens PR updating a SHA-pinned action | CI runs on Dependabot PR; checks pass; PR is reviewable | Low |
| T25 | Security | Permissions are minimal on CI | Inspect `ci.yml` | Only `contents: read` at workflow level; no `id-token`, no `write` permissions | High |
| T26 | Security | Permissions are correct on Publish | Inspect `publish.yml` | `contents: read` + `id-token: write` only; no `contents: write` or `packages: write` | High |
| T27 | Security | Actions are SHA-pinned | Inspect both workflow files | All `uses:` references use full SHA, not tags; version comment present | High |
| T28 | Security | No secrets in workflow logs | Run publish workflow and inspect full logs | No npm tokens, OIDC tokens, or sensitive data visible in step output | High |
| T29 | Security | GitHub Environment `npm` is required | Publish job specifies `environment: npm` | Job pauses if environment not configured; OIDC token includes environment claim | Medium |
| T30 | Security | Dependabot configured for actions | Inspect `.github/dependabot.yml` | `package-ecosystem: github-actions` with weekly schedule | Medium |

## Edge Cases

### `workflow_run` Context Mismatch
The `workflow_run` event runs in the context of the default branch, meaning `github.sha` and `github.ref` point to `main`, not the tag. The publish workflow must use `github.event.workflow_run.head_sha` for checkout and `github.event.workflow_run.head_branch` for tag detection [ref: ./01-architecture.md#4-publish-workflow-publishyml]. **Test strategy**: Verify in T08 that the checked-out code matches the tagged commit by comparing `head_sha` in logs with the actual tag SHA.

### Tag Push from Non-Main Branch
If a maintainer accidentally creates a `v*` tag on a feature branch, CI will run and publish will proceed (no branch filter on tag pushes) [ref: ./02-dataflow.md#3-release-flow]. **Test strategy**: This is a maintainer discipline issue documented in use cases [ref: ./05-usecases.md#uc-3]. No automated guard — mitigated by documentation.

### First Publish Chicken-and-Egg
OIDC trusted publishing requires the package to exist on npm before configuration [ref: ../01-research/02-external-research.md#pitfalls]. The first publish must be manual with a granular token [ref: ./02-dataflow.md#4-first-publish-flow-one-time-setup]. **Test strategy**: Covered by UC-4 in use cases. T22 verifies the transition from manual to automated publishing.

### Two CI Runs on `git push --follow-tags`
When `git push --follow-tags` is used, GitHub receives both a branch push and a tag push, triggering two CI runs [ref: ./04-decisions.md#adr-2]. **Test strategy**: T21 verifies that only the tag-triggered CI run leads to a publish. The branch-triggered CI run should complete normally without triggering publish.

## Performance Criteria

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| CI workflow duration | < 3 minutes | Small project with ~10 dependencies; `npm ci` with cache + 4 checks should be fast |
| Publish workflow duration | < 2 minutes | Build is simple `tsc` compilation; OIDC + publish adds minimal overhead |
| npm cache hit rate | > 90% after first run | Lockfile changes infrequently; `setup-node` cache should be effective |

These are soft thresholds for monitoring, not hard gates.

## Correctness Verification

End-to-end validation of the complete pipeline follows this sequence:

1. **Pre-flight**: Verify YAML syntax of all workflow files (`ci.yml`, `publish.yml`, `dependabot.yml`) — no syntax errors in GitHub Actions tab.
2. **CI validation**: Open a test PR with valid code → confirm all 4 checks pass (T01, T04). Open a PR with intentional lint error → confirm CI fails (T14).
3. **Publish validation**: After first manual publish and OIDC setup (UC-4), push a patch version tag → confirm CI passes → publish triggers → package appears on npm with provenance (T07–T12, T22).
4. **Negative validation**: Confirm publish is skipped on non-tag CI runs (T18) and on failed CI tag runs (T17).
5. **Security audit**: Inspect both workflow files for SHA pinning (T27), minimal permissions (T25, T26), and logs for secret leakage (T28).
