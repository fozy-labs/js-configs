---
title: "Architecture Decision Records"
date: 2026-03-20
stage: 02-design
role: rdpi-architect
workflow: b0.4
---

# Architecture Decision Records

## ADR-1: OIDC Trusted Publishing vs Granular Access Token

### Status
Accepted

### Context
npm offers two current authentication methods for publishing from CI: OIDC-based trusted publishing and granular access tokens. Legacy automation tokens were removed in November 2025 [ref: [external research §2](../01-research/02-external-research.md#2-authentication-methods)]. The package `@fozy-labs/js-configs` is at v0.1.0 and has never been published to npm [ref: [codebase analysis §4](../01-research/01-codebase-analysis.md#4-package-metadata)]. Trusted publishing is npm's official recommendation: "When trusted publishing is available for your workflow, always prefer it over long-lived tokens" [ref: [external research §2](../01-research/02-external-research.md#current-best-practice-20252026)].

### Options Considered
1. **Trusted Publishing (OIDC)** — Token-free authentication via GitHub Actions OIDC. npm CLI 11.5.1+ auto-detects the OIDC environment. — Pros: no secrets to manage; short-lived credentials; automatic provenance; strongest security / Cons: requires npm CLI 11.5.1+ and Node 22.14.0+; package must be pre-configured on npmjs.com; first publish requires manual step with a granular token
2. **Granular Access Token** — Fine-grained npm token stored as GitHub secret. — Pros: works with any Node.js version; flexible scope/IP/expiry restrictions; universal compatibility / Cons: must be stored as secret; requires manual rotation; persistent credential risk

### Decision
**Trusted Publishing (OIDC)** for all CI-based publishes. The first publish is performed manually using a temporary granular access token, which is revoked immediately after.

### Consequences
- **Positive**: Zero persistent secrets in GitHub; short-lived credentials reduce attack surface; aligns with npm's official recommendation; provenance generation is automatic
- **Negative**: First publish requires a manual one-time step outside CI; trusted publisher must be configured on npmjs.com after first publish
- **Risks**: Node.js version locked to 22.x+ for publish workflow (acceptable — Node 22.x is Maintenance LTS until April 2027 [ref: [external research §4](../01-research/02-external-research.md#4-ci-matrix-strategy)])

---

## ADR-2: Two Separate Workflow Files vs Single File

### Status
Accepted

### Context
The project has no existing CI/CD infrastructure [ref: [codebase analysis §6](../01-research/01-codebase-analysis.md#6-existing-ci-artifacts)]. Two established patterns exist: a single workflow file with CI and publish jobs connected via `needs`, and two separate files (`ci.yml` + `publish.yml`) [ref: [external research §6](../01-research/02-external-research.md#6-workflow-structure)]. GitHub's official example uses a single file [ref: [external research §6](../01-research/02-external-research.md#githubs-official-example)], while the community standard for small projects is two files [ref: [external research §6](../01-research/02-external-research.md#common-community-pattern)].

### Options Considered
1. **Single workflow** (`ci-publish.yml`) with `needs` between jobs — Pros: publish inherently depends on CI via `needs`; single file to maintain; atomic configuration / Cons: file grows with complexity; CI job runs on PRs AND releases (needs conditional logic); harder to read
2. **Two separate workflows** (`ci.yml` + `publish.yml`) — Pros: clear separation of concerns; CI runs independently on PRs without publish logic; simpler individual files / Cons: publish doesn't inherently depend on CI (requires `workflow_run`); duplicated checkout/setup steps
3. **Two workflows with `workflow_run`** — Pros: separation of concerns AND publish depends on CI; clear trigger chain / Cons: `workflow_run` adds complexity (runs on default branch context, doesn't support tag branch filters natively)

### Decision
**Two separate workflows connected via `workflow_run`**. `ci.yml` triggers on push (main + tags) and PRs. `publish.yml` triggers on `workflow_run` of CI, filtered by job condition to only run for successful tag-triggered CI runs.

### Consequences
- **Positive**: Clean separation — CI file contains only check logic, publish file contains only publish logic; publish is gated on CI success; each file is simple and focused
- **Negative**: `workflow_run` requires careful handling of context (checkout ref, tag detection); two CI runs fire on `git push --follow-tags` (one for branch, one for tag) — minor resource cost
- **Risks**: `workflow_run` context runs on default branch — must explicitly use `github.event.workflow_run.head_sha` for checkout; `head_branch` filtering for tag detection needs validation during implementation

---

## ADR-3: Tag Push Trigger vs Release Event Trigger

### Status
Accepted

### Context
GitHub Actions supports multiple trigger mechanisms for publishing. The `release: types: [published]` event is GitHub's official recommendation and ties to the Releases UI [ref: [external research §3](../01-research/02-external-research.md#3-github-actions-workflow-triggers)]. The `push: tags: ['v*']` trigger is simpler and widely used, especially with `npm version` + push workflow [ref: [external research §3](../01-research/02-external-research.md#established-practice)]. npm trusted publishing examples use tag push as their primary example.

### Options Considered
1. **`release: types: [published]`** — Pros: GitHub's official recommendation; Releases UI with release notes; explicit manual control / Cons: two-step process (tag creation → release creation); requires interaction with GitHub UI or API
2. **`push: tags: ['v*']`** — Pros: single step (`npm version` + `git push --follow-tags`); works naturally with `npm version` workflow; used in npm trusted publishing examples / Cons: no built-in release notes; anyone with push access can trigger; harder to manage pre-releases
3. **Combined (both + `workflow_dispatch`)** — Pros: maximum flexibility / Cons: complexity; risk of duplicate publishes

### Decision
**`push: tags: ['v*']`** as the effective trigger (via the CI → `workflow_run` chain). Tags are created by `npm version` and pushed with `git push --follow-tags`.

### Consequences
- **Positive**: Minimal ceremony — `npm version patch && git push --follow-tags` is a single-line release; no GitHub UI interaction required; natural fit with `npm version` workflow
- **Negative**: No automatic GitHub Release creation (can be added later if needed); tag protection rules recommended to prevent accidental triggers
- **Risks**: Anyone with push access can push a `v*` tag. Mitigated by: npm won't allow overwriting a published version; CI checks run before publish

---

## ADR-4: Node.js 22.x Single Version vs Matrix

### Status
Accepted

### Context
Node.js 20.x reaches EOL in April 2026 (one month from now), 22.x is Maintenance LTS until April 2027, 24.x is Active LTS [ref: [external research §4](../01-research/02-external-research.md#nodejs-lts-versions-20252026)]. The package is a config-only package (ESLint, Prettier, TypeScript, Vitest configs) — configs are consumed at dev-time, not runtime [ref: [external research §4](../01-research/02-external-research.md#matrix-testing-value-for-config-packages)]. Trusted publishing requires Node 22.14.0+ [ref: [external research §2](../01-research/02-external-research.md#2-authentication-methods)]. No `engines` field currently exists [ref: [codebase analysis §5](../01-research/01-codebase-analysis.md#5-dependencies)].

### Options Considered
1. **Node 22.x single version** — Pros: satisfies trusted publishing requirement; Maintenance LTS until April 2027; single CI run (faster); sufficient for config package / Cons: not the latest Active LTS
2. **Node 24.x single version** — Pros: Active LTS until April 2028; latest features / Cons: consumers on 22.x might encounter issues not caught by CI
3. **Matrix [22, 24]** — Pros: tests on both LTS versions; catches version-specific issues / Cons: doubles CI time; for config-only package, version-specific issues are extremely unlikely

### Decision
**Node.js 22.x single version** (`node-version: '22.x'`). No matrix.

### Consequences
- **Positive**: Fastest CI execution; `22.x` is the minimum for trusted publishing; sufficient for config-only package; simple configuration
- **Negative**: Does not verify compatibility with Node 24.x (minimal risk for this type of package)
- **Risks**: If future additions introduce Node.js API usage, matrix testing may become relevant — reassess when package scope changes

---

## ADR-5: SHA Pinning for GitHub Actions

### Status
Accepted

### Context
GitHub's security hardening guide states: "Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release" [ref: [external research §7 item 2](../01-research/02-external-research.md#7-security-best-practices)]. Tag-based references (e.g., `@v4`) are mutable and vulnerable to supply chain attacks via tag mutation. The "Medium" security level includes SHA pinning + Dependabot for automatic updates [ref: [open questions Q8](../01-research/03-open-questions.md#q8-уровень-security-hardening--минимальный-или-полный)].

### Options Considered
1. **Pin by tag** (e.g., `actions/checkout@v4`) — Pros: readable; easy to maintain manually / Cons: tags are mutable; vulnerable to supply chain attacks
2. **Pin by SHA** (e.g., `actions/checkout@<sha> # v4.2.2`) — Pros: immutable; secure; GitHub's official recommendation / Cons: SHAs are not human-readable (mitigated by version comments); requires tooling for updates
3. **Pin by SHA + Dependabot** — Pros: immutable + automated updates; version comments in Dependabot PRs / Cons: weekly Dependabot PRs (low overhead)

### Decision
**Pin all actions by full-length commit SHA** with version comments, combined with Dependabot for automated updates (`github-actions` package ecosystem).

### Consequences
- **Positive**: Protection against tag mutation attacks; automated update workflow via Dependabot PRs; audit trail for version changes
- **Negative**: SHA values are not human-readable (mitigated by comments); Dependabot PRs require review and merge
- **Risks**: Minimal — Dependabot PRs are low-effort to review; actions/checkout and actions/setup-node are maintained by GitHub

---

## ADR-6: Manual Versioning vs Automated

### Status
Accepted

### Context
The project is at v0.1.0, maintained by a solo/small team [ref: [codebase analysis §4](../01-research/01-codebase-analysis.md#4-package-metadata)]. External research identified four versioning approaches: manual `npm version`, release-please, changesets, and semantic-release [ref: [external research §9](../01-research/02-external-research.md#9-version-management)]. TASK.md does not include versioning automation in deliverables [ref: [open questions Q5](../01-research/03-open-questions.md#q5-версионирование--ручное-или-автоматизированное)].

### Options Considered
1. **Manual** (`npm version patch/minor/major`) — Pros: zero dependencies; full control; simplest for solo project; no Conventional Commits discipline required / Cons: human error risk; no auto-changelog
2. **release-please** — Pros: auto-CHANGELOG; Release PRs; Conventional Commits support / Cons: adds dependency; requires commit discipline; out of scope for this task
3. **semantic-release** — Pros: fully automated end-to-end / Cons: complex configuration; opinionated; overkill for config package

### Decision
**Manual versioning** using `npm version`. The release process: `npm version patch/minor/major` → `git push --follow-tags`.

### Consequences
- **Positive**: Zero additional dependencies; full developer control; aligns with task scope; minimal learning curve
- **Negative**: No auto-generated changelog; relies on developer discipline for semver
- **Risks**: Forgetting to push tags (`--follow-tags`), or pushing tag from wrong branch. Mitigated by documentation in setup guide.

---

## ADR-7: Adding `engines` Field to package.json

### Status
Accepted

### Context
`package.json` currently lacks an `engines` field [ref: [codebase analysis §5](../01-research/01-codebase-analysis.md#5-dependencies)]. Without it, npm does not warn users about incompatible Node.js versions. The choice of Node.js 22.x for CI (ADR-4) and the trusted publishing requirement (Node 22.14.0+ for npm CLI 11.5.1+) [ref: [external research §2](../01-research/02-external-research.md#2-authentication-methods)] are directly related to the declared minimum version.

### Options Considered
1. **Add `engines` with `"node": ">=22.0.0"`** — Pros: explicit version declaration; npm warns on incompatible installs; aligns CI version with package requirements; one-line change / Cons: slightly enlarges task scope
2. **Do not add** — Pros: stays strictly in CI scope / Cons: consumers have no version guidance; disconnect between CI test version and declared support
3. **Add in a separate PR** — Pros: clean separation of concerns / Cons: creates an additional task; `engines` choice is intrinsically linked to CI Node.js version

### Decision
**Add `engines` field** in `package.json` as part of this task: `"node": ">=22.0.0"`.

### Consequences
- **Positive**: Consumers are informed of the minimum Node.js version; npm emits warnings on version mismatch; `engines` aligns with the CI test environment
- **Negative**: Users on Node.js 20.x will receive a warning (acceptable — Node 20.x reaches EOL in April 2026 [ref: [external research §4](../01-research/02-external-research.md#nodejs-lts-versions-20252026)])
- **Risks**: The value `>=22.0.0` may be more restrictive than necessary for consumer usage (configs don't use Node.js APIs), but it provides a clear and defensible boundary matching the CI test environment
