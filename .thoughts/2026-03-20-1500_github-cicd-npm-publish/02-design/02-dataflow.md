---
title: "CI/CD Data Flow"
date: 2026-03-20
stage: 02-design
role: rdpi-architect
workflow: b0.4
---

# CI/CD Data Flow

## 1. PR Flow

A developer pushes a branch or opens a pull request targeting `main`. CI runs all checks and reports status back to the PR.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GH as GitHub Repository
    participant CI as CI Workflow (ci.yml)
    participant PR as Pull Request Status

    Dev->>GH: git push (feature branch)
    Dev->>GH: Open PR → main
    GH->>CI: Trigger (pull_request: main)
    
    activate CI
    CI->>CI: actions/checkout
    CI->>CI: actions/setup-node (22.x, cache: npm)
    CI->>CI: npm ci
    CI->>CI: npm run ts-check
    CI->>CI: npm run format:check
    CI->>CI: npm run lint
    CI->>CI: npm run test
    deactivate CI
    
    CI->>PR: Report status (✅ pass / ❌ fail)
    PR->>Dev: Status visible in PR checks
```

**Trigger**: `pull_request` event targeting `main` branch.

**Data flow**: Source code → checkout → dependency install (from `package-lock.json` cache) → sequential check pipeline → status check result.

**Edge cases**:
- If `npm ci` fails (lockfile mismatch), all subsequent steps are skipped
- Each step depends on previous step — failure stops the pipeline
- PR from fork: CI runs with read-only permissions (no secret access)

## 2. Merge to Main Flow

When a PR is merged (or a direct push to `main`), CI runs the same checks as a validation gate.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GH as GitHub Repository
    participant CI as CI Workflow (ci.yml)

    Dev->>GH: Merge PR → main (or direct push)
    GH->>CI: Trigger (push: branches: main)
    
    activate CI
    CI->>CI: actions/checkout (main HEAD)
    CI->>CI: actions/setup-node (22.x, cache: npm)
    CI->>CI: npm ci
    CI->>CI: npm run ts-check
    CI->>CI: npm run format:check
    CI->>CI: npm run lint
    CI->>CI: npm run test
    deactivate CI
    
    CI->>GH: Status reported on commit
```

**Trigger**: `push` event on `main` branch.

**Data flow**: Identical to PR flow, but runs against the merged commit on `main`. This serves as a post-merge validation — important because merge commits can introduce issues not caught in individual PR checks.

**Note**: This workflow run does NOT trigger publish — the `workflow_run` condition in `publish.yml` filters for tag pushes only (`startsWith(head_branch, 'v')`).

## 3. Release Flow

The primary release scenario: maintainer bumps version, pushes tag, CI runs checks, and publish workflow builds and publishes to npm.

```mermaid
sequenceDiagram
    actor Maintainer as Maintainer
    participant Local as Local Machine
    participant GH as GitHub Repository
    participant CI as CI Workflow (ci.yml)
    participant PW as Publish Workflow (publish.yml)
    participant OIDC as Sigstore / Fulcio
    participant NPM as npm Registry
    participant Rekor as Rekor Ledger

    Maintainer->>Local: npm version patch/minor/major
    Note right of Local: Updates package.json version<br/>Creates git commit<br/>Creates git tag (v*.*.*)
    Local->>GH: git push --follow-tags
    Note right of GH: Pushes commit to main<br/>AND tag v*.*.*

    GH->>CI: Trigger (push: tags: v*)
    activate CI
    CI->>CI: Checkout tagged commit
    CI->>CI: Setup Node 22.x + npm ci
    CI->>CI: ts-check → format:check → lint → test
    deactivate CI
    CI->>GH: CI completed (success ✅)

    GH->>PW: workflow_run (CI completed)
    
    activate PW
    PW->>PW: Check: conclusion == success?
    PW->>PW: Check: head_branch starts with 'v'?
    
    PW->>PW: actions/checkout (ref: head_sha)
    PW->>PW: actions/setup-node (22.x, registry-url)
    PW->>PW: npm ci
    PW->>PW: npm run build (rimraf dist && tsc)
    
    PW->>OIDC: Request OIDC token (id-token: write)
    OIDC-->>PW: Short-lived X.509 certificate
    
    PW->>NPM: npm publish --provenance --access public
    Note right of NPM: Package signed with<br/>Sigstore certificate
    NPM-->>PW: Published ✅
    
    PW->>Rekor: Log provenance signature
    deactivate PW
    
    NPM->>NPM: Package available with provenance badge
```

**Trigger chain**: Tag push → CI (push: tags) → workflow_run → Publish.

**Data flow**:
1. `npm version` modifies `package.json` version, creates commit + tag locally
2. `git push --follow-tags` pushes both commit and tag to remote
3. Tag push triggers CI workflow — checks run against the tagged commit
4. CI completion fires `workflow_run` event
5. Publish workflow validates: CI passed + tag push
6. Checkout uses `github.event.workflow_run.head_sha` (the tagged commit, not main HEAD)
7. Build compiles TypeScript to `dist/` [ref: [codebase analysis §1](../01-research/01-codebase-analysis.md#1-build-pipeline)]
8. npm CLI auto-detects OIDC environment, exchanges token with npm registry [ref: [external research §2](../01-research/02-external-research.md#2-authentication-methods)]
9. Sigstore signs the package, logs to Rekor transparency ledger [ref: [external research §1](../01-research/02-external-research.md#1-npm-provenance-and-oidc)]

**Edge cases**:
- CI fails on tag push → publish workflow fires but `conclusion != 'success'` → job skipped
- Tag pushed from non-main branch → CI runs, publish runs (no branch filter on tag pushes). Maintainer discipline required.
- npm version already exists → `npm publish` fails with `403 - version already exists`
- OIDC token minting fails → publish step fails, no partial publish risk (npm is atomic)

## 4. First Publish Flow (One-Time Setup)

The initial package publish cannot use OIDC — the package must exist on npm before trusted publishing can be configured [ref: [external research, Pitfalls §5](../01-research/02-external-research.md#pitfalls)].

```mermaid
sequenceDiagram
    actor Maintainer as Maintainer
    participant NPM_Web as npmjs.com (Web UI)
    participant Local as Local Machine
    participant NPM as npm Registry
    participant GH_Web as GitHub (Web UI)

    Note over Maintainer,GH_Web: Prerequisites: npm account exists,<br/>@fozy-labs org exists on npm

    Maintainer->>NPM_Web: Create granular access token<br/>(scope: @fozy-labs, read-write)
    NPM_Web-->>Maintainer: Token: npm_xxxx

    Maintainer->>Local: npm login (or set token in .npmrc)
    Maintainer->>Local: git clone fozy-labs/js-configs
    Maintainer->>Local: npm ci && npm run build
    Maintainer->>Local: npm publish --access public
    Local->>NPM: First publish (v0.1.0)
    NPM-->>Local: Published ✅

    Note over Maintainer,GH_Web: Package now exists on npm.<br/>Configure trusted publishing.

    Maintainer->>NPM_Web: Package Settings → Trusted Publishers
    Maintainer->>NPM_Web: Add GitHub Actions publisher:<br/>• repo: fozy-labs/js-configs<br/>• workflow: publish.yml<br/>• environment: npm

    Maintainer->>GH_Web: Settings → Environments → Create 'npm'
    
    Note over Maintainer,GH_Web: Revoke granular access token.<br/>All subsequent publishes via OIDC.

    Maintainer->>NPM_Web: Revoke granular token
```

**Data flow**: Manual, one-time process performed outside of CI.

**Steps**:
1. Create a granular access token on npm with write access to `@fozy-labs` scope
2. Build locally: `npm ci && npm run build`
3. Publish manually: `npm publish --access public` (no `--provenance` — not needed for first publish)
4. Configure trusted publisher on npm: link `fozy-labs/js-configs` repo, `publish.yml` workflow, `npm` environment
5. Create GitHub Environment `npm` in repository settings
6. Revoke the granular token — no longer needed after OIDC is configured

**Edge cases**:
- Forgot `--access public` → npm returns error for scoped package (though `publishConfig.access: "public"` in `package.json` handles this [ref: [codebase analysis §4](../01-research/01-codebase-analysis.md#4-package-metadata)])
- `repository` field mismatch in `package.json` → provenance will fail later (case-sensitive) [ref: [external research, Pitfalls §2](../01-research/02-external-research.md#pitfalls)]. Currently set to `git+https://github.com/fozy-labs/js-configs.git` [ref: [codebase analysis §4](../01-research/01-codebase-analysis.md#4-package-metadata)]

## 5. Parallel Push Scenario

When `git push --follow-tags` is executed, GitHub receives both the commit push (to main) and the tag push simultaneously. This results in two CI workflow runs:

```mermaid
flowchart TB
    push["git push --follow-tags"]
    
    push --> push_main["Push event: main branch"]
    push --> push_tag["Push event: tag v*"]
    
    push_main --> ci_main["CI run #1<br/>(branch: main)"]
    push_tag --> ci_tag["CI run #2<br/>(tag: v*.*.*)"]
    
    ci_main --> wr_main["workflow_run event"]
    ci_tag --> wr_tag["workflow_run event"]
    
    wr_main --> check_main{"head_branch<br/>starts with 'v'?"}
    wr_tag --> check_tag{"head_branch<br/>starts with 'v'?"}
    
    check_main -->|"No (branch name)"| skip["Publish skipped"]
    check_tag -->|"Yes (tag name)"| publish["Publish runs"]
```

**Key observation**: Two CI runs trigger two `workflow_run` events. The job condition `startsWith(head_branch, 'v')` ensures only the tag-triggered run proceeds to publish. The branch-triggered run's `workflow_run` is filtered out.

This is expected behavior, not a bug. The extra CI run on main is a minor cost with no negative side effects.
