---
title: "Phase 1: CI/CD Pipeline"
date: 2026-03-20
stage: 03-plan
role: rdpi-planner
workflow: b0.4
---

## Goal

Create the complete CI/CD infrastructure: CI workflow, Publish workflow, Dependabot configuration, and add `engines` field to `package.json`. After this phase, all GitHub Actions files are committed and the pipeline is ready for use (pending one-time npm setup per UC-4).

## Dependencies

- **Requires**: None
- **Blocks**: Phase 2 (Setup Guide)

## Execution

Sequential — this is the first phase with no prior dependencies.

## Tasks

### Task 1.1: Create CI Workflow

- **File**: `.github/workflows/ci.yml`
- **Action**: Create
- **Description**: Create the CI checks workflow with triggers, permissions, and check steps.
- **Details**:
  - Workflow name: `CI` (publish.yml references this exact name in `workflow_run.workflows`)
  - Triggers [ref: ../02-design/01-architecture.md §3]:
    - `push: branches: [main]` and `tags: ['v*']`
    - `pull_request: branches: [main]`
  - Permissions at workflow level: `contents: read`
  - Single job `checks` on `ubuntu-latest`
  - Steps (sequential):
    1. `actions/checkout` — SHA-pinned with version comment
    2. `actions/setup-node` — SHA-pinned, `node-version: '22.x'`, `cache: 'npm'`
    3. `run: npm ci`
    4. `run: npm run ts-check`
    5. `run: npm run format:check`
    6. `run: npm run lint`
    7. `run: npm run test`
  - Resolve current SHA values for `actions/checkout` (latest v4) and `actions/setup-node` (latest v4) at implementation time [ref: ../02-design/01-architecture.md §7]

### Task 1.2: Create Publish Workflow

- **File**: `.github/workflows/publish.yml`
- **Action**: Create
- **Description**: Create the publish workflow triggered by CI completion, gated by success + tag condition, using OIDC and provenance.
- **Details**:
  - Workflow name: `Publish`
  - Trigger [ref: ../02-design/01-architecture.md §4]:
    ```yaml
    on:
      workflow_run:
        workflows: ["CI"]
        types: [completed]
    ```
  - Permissions at workflow level: `contents: read`, `id-token: write`
  - Single job `publish` on `ubuntu-latest`
  - Job-level `environment: npm`
  - Job condition [ref: ../02-design/01-architecture.md §4]:
    ```yaml
    if: >-
      github.event.workflow_run.conclusion == 'success' &&
      startsWith(github.event.workflow_run.head_branch, 'v')
    ```
  - Steps (sequential):
    1. `actions/checkout` — SHA-pinned, `ref: ${{ github.event.workflow_run.head_sha }}`
    2. `actions/setup-node` — SHA-pinned, `node-version: '22.x'`, `registry-url: 'https://registry.npmjs.org'`
    3. `run: npm ci`
    4. `run: npm run build`
    5. `run: npm publish --provenance --access public`
  - No `NODE_AUTH_TOKEN` env — npm CLI 11.5.1+ auto-detects OIDC [ref: ../02-design/01-architecture.md §4]
  - Reuse the same SHA-pinned action references as ci.yml

### Task 1.3: Create Dependabot Configuration

- **File**: `.github/dependabot.yml`
- **Action**: Create
- **Description**: Configure Dependabot for weekly GitHub Actions SHA-pin updates.
- **Details** [ref: ../02-design/01-architecture.md §6]:
  - `version: 2`
  - Single entry: `package-ecosystem: "github-actions"`, `directory: "/"`, `schedule.interval: "weekly"`
  - Only `github-actions` ecosystem — npm dependencies managed separately

### Task 1.4: Add `engines` Field to package.json

- **File**: `package.json`
- **Action**: Modify
- **Description**: Add `engines` field declaring Node.js >=22.0.0 requirement.
- **Details** [ref: ../02-design/01-architecture.md §5, ../02-design/04-decisions.md ADR-7]:
  - Add after the `"sideEffects"` field (before `"publishConfig"`):
    ```json
    "engines": {
      "node": ">=22.0.0"
    },
    ```
  - Value `>=22.0.0` (not `>=22.14.0`) — allows any 22.x for consumers; the 22.14.0+ requirement applies only to CI publish step

## Verification

- [ ] `npm run ts-check` passes (package.json change does not affect compilation)
- [ ] `.github/workflows/ci.yml` is valid YAML with correct trigger structure
- [ ] `.github/workflows/publish.yml` is valid YAML with correct `workflow_run` trigger and job condition
- [ ] `.github/dependabot.yml` is valid YAML with `github-actions` ecosystem
- [ ] `package.json` contains `"engines": { "node": ">=22.0.0" }` field
- [ ] All `uses:` references in both workflows use full-length SHA with version comments
- [ ] Publish workflow references CI workflow by exact name `"CI"` in `workflow_run.workflows`
- [ ] Publish checkout uses `github.event.workflow_run.head_sha`
- [ ] Publish job condition checks `conclusion == 'success'` AND `startsWith(head_branch, 'v')`
- [ ] CI workflow permissions: only `contents: read`
- [ ] Publish workflow permissions: `contents: read` + `id-token: write`
- [ ] Publish job has `environment: npm`
