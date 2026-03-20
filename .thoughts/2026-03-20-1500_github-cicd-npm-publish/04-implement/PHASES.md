---
title: "Phases: 04-implement"
date: 2026-03-20
stage: 04-implement
---

# Phases: 04-implement

## Phase 1: Implement CI/CD Pipeline (Plan Phase 1)

- **Agent**: `rdpi-codder`
- **Output**: Code changes per ../03-plan/01-cicd-pipeline.md
- **Depends on**: —
- **Retry limit**: 2

### Prompt

Implement plan phase 1 for the GitHub CI/CD feature.

**Read these files first:**
- Task: `../TASK.md`
- Plan phase: `../03-plan/01-cicd-pipeline.md`
- Architecture design: `../02-design/01-architecture.md`
- Dataflow design: `../02-design/02-dataflow.md`
- Decisions (ADRs): `../02-design/04-decisions.md`

**What to implement (4 tasks):**

1. **Create `.github/workflows/ci.yml`** — CI checks workflow:
   - Workflow name: `CI`
   - Triggers: `push` on `main` branch and `v*` tags; `pull_request` on `main`
   - Permissions: `contents: read`
   - Single job `checks` on `ubuntu-latest`
   - Steps: checkout → setup-node (22.x, cache npm) → `npm ci` → `npm run ts-check` → `npm run format:check` → `npm run lint` → `npm run test`
   - All `uses:` actions must be SHA-pinned with version comments (e.g., `actions/checkout@<sha> # v4`)
   - Resolve current SHA values for `actions/checkout` v4 and `actions/setup-node` v4

2. **Create `.github/workflows/publish.yml`** — Publish workflow:
   - Workflow name: `Publish`
   - Trigger: `workflow_run` on workflows `["CI"]`, types `[completed]`
   - Permissions: `contents: read`, `id-token: write`
   - Single job `publish` on `ubuntu-latest` with `environment: npm`
   - Job condition: `github.event.workflow_run.conclusion == 'success' && startsWith(github.event.workflow_run.head_branch, 'v')`
   - Steps: checkout (with `ref: ${{ github.event.workflow_run.head_sha }}`) → setup-node (22.x, registry-url `https://registry.npmjs.org`) → `npm ci` → `npm run build` → `npm publish --provenance --access public`
   - No `NODE_AUTH_TOKEN` env — npm CLI auto-detects OIDC
   - Same SHA-pinned action references as ci.yml

3. **Create `.github/dependabot.yml`**:
   - `version: 2`
   - Single entry: `package-ecosystem: "github-actions"`, `directory: "/"`, `schedule.interval: "weekly"`

4. **Modify `package.json`** — add `engines` field:
   - Add after the `"sideEffects"` field (before `"publishConfig"`):
     ```json
     "engines": {
       "node": ">=22.0.0"
     },
     ```

**Constraints:**
- Follow existing code patterns precisely
- Do NOT modify files outside this phase's scope
- If `npm run ts-check` fails after implementation, fix within scope (max 2 attempts)

---

## Phase 2: Verify CI/CD Pipeline (Plan Phase 1)

- **Agent**: `rdpi-tester`
- **Output**: `verification-1.md`
- **Depends on**: Phase 1
- **Retry limit**: 1

### Prompt

Verify the implementation of plan phase 1 (CI/CD pipeline files + package.json engines field).

**Read the plan phase for verification criteria:**
- Plan phase: `../03-plan/01-cicd-pipeline.md` (see "Verification" section at bottom)

**Run these checks:**

1. `npm run ts-check` — must pass (package.json change should not affect compilation)
2. Validate `.github/workflows/ci.yml`:
   - Is valid YAML
   - Has correct trigger structure (`push` on main + v* tags, `pull_request` on main)
   - Permissions: only `contents: read`
   - All `uses:` references use full-length SHA with version comments
3. Validate `.github/workflows/publish.yml`:
   - Is valid YAML
   - Has `workflow_run` trigger referencing workflow name `"CI"`
   - Permissions: `contents: read` + `id-token: write`
   - Job has `environment: npm`
   - Job condition checks `conclusion == 'success'` AND `startsWith(head_branch, 'v')`
   - Checkout uses `github.event.workflow_run.head_sha`
   - No `NODE_AUTH_TOKEN` env variable
4. Validate `.github/dependabot.yml`:
   - Is valid YAML
   - Has `github-actions` ecosystem with weekly schedule
5. Validate `package.json`:
   - Contains `"engines": { "node": ">=22.0.0" }` field
   - Field is properly placed (after `sideEffects`, before `publishConfig`)

**Report format:** Pass/fail per check with error details if failed. Save the report to `04-implement/verification-1.md`.

If any checks fail, report them — do not attempt fixes.

---

## Phase 3: Implement Setup Guide (Plan Phase 2)

- **Agent**: `rdpi-codder`
- **Output**: Code changes per ../03-plan/02-setup-guide.md
- **Depends on**: Phase 1
- **Retry limit**: 2

### Prompt

Implement plan phase 2 for the GitHub CI/CD feature.

**Read these files first:**
- Task: `../TASK.md`
- Plan phase: `../03-plan/02-setup-guide.md`
- Documentation design: `../02-design/07-docs.md`
- Architecture (for trusted publisher values): `../02-design/01-architecture.md`
- Dataflow (for first publish flow): `../02-design/02-dataflow.md`
- Use cases: `../02-design/05-usecases.md`
- Risks (for troubleshooting section): `../02-design/08-risks.md`
- The implemented workflows (to reference correct filenames): `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

**What to implement (1 task):**

1. **Create `.mentall/cicd-setup.md`** — Setup guide in Russian:
   - Language: Russian throughout
   - Format: concise step-by-step instructions + links to official docs
   - Target size: ~50–80 lines
   - No screenshots — text-based instructions only
   - Required sections (7):
     1. **Prerequisites** — npm account, `@fozy-labs` org on npm, GitHub repo access
     2. **Создание npm granular access token** — type (granular), scope (`@fozy-labs`), read-write, short expiration; link to npm docs
     3. **Первая публикация** — `npm ci && npm run build && npm publish --access public` with granular token; note `--provenance` not used for first publish
     4. **Настройка OIDC trusted publisher на npm** — npmjs.com → Package Settings → Trusted Publishers; values: repo `fozy-labs/js-configs`, workflow `publish.yml`, environment `npm`; link to npm docs
     5. **Настройка GitHub Environment `npm`** — GitHub → Settings → Environments → New → `npm`; link to GitHub docs
     6. **Процесс выпуска версии** — `npm version patch/minor/major` → `git push --follow-tags`; describe CI → publish chain
     7. **Troubleshooting** — OIDC auth failure, version exists, CI fails on tag, forgetting `--follow-tags`
   - Trusted publisher values MUST match publish.yml (workflow `publish.yml`, environment `npm`)

**Constraints:**
- Follow the documentation design from `../02-design/07-docs.md`
- Do NOT modify files outside this phase's scope
- The `.mentall` directory is gitignored — confirmed in `.gitignore`

---

## Phase 4: Verify Setup Guide (Plan Phase 2)

- **Agent**: `rdpi-tester`
- **Output**: `verification-2.md`
- **Depends on**: Phase 3
- **Retry limit**: 1

### Prompt

Verify the implementation of plan phase 2 (setup guide).

**Read the plan phase for verification criteria:**
- Plan phase: `../03-plan/02-setup-guide.md` (see "Verification" section at bottom)
- The implemented guide: `.mentall/cicd-setup.md`
- The publish workflow (to cross-check values): `.github/workflows/publish.yml`

**Run these checks:**

1. `npm run ts-check` — must pass (markdown file should not affect compilation)
2. `.mentall/cicd-setup.md` exists and is non-empty
3. Guide contains all 7 required sections:
   - Prerequisites
   - Создание npm granular access token
   - Первая публикация
   - Настройка OIDC trusted publisher на npm
   - Настройка GitHub Environment `npm`
   - Процесс выпуска версии
   - Troubleshooting
4. Guide is written in Russian
5. Guide contains links to official npm and GitHub documentation
6. Trusted publisher values match those in `publish.yml` (workflow name `publish.yml`, environment `npm`)
7. Confirm `.mentall` is in `.gitignore`

**Report format:** Pass/fail per check with error details if failed. Save the report to `04-implement/verification-2.md`.

If any checks fail, report them — do not attempt fixes.

---

## Phase 5: Implementation Review

- **Agent**: `rdpi-implement-reviewer`
- **Output**: Updates `README.md`
- **Depends on**: Phases 2, 4
- **Retry limit**: 2

### Prompt

Review the complete implementation of the GitHub CI/CD feature and write the implementation record.

**Read these files:**
- Task: `../TASK.md`
- Plan phases: `../03-plan/01-cicd-pipeline.md`, `../03-plan/02-setup-guide.md`
- Research summary: `../01-research/README.md`
- Design documents: `../02-design/README.md`, `../02-design/01-architecture.md`, `../02-design/04-decisions.md`
- Verification reports: `04-implement/verification-1.md`, `04-implement/verification-2.md`
- Implemented files:
  - `.github/workflows/ci.yml`
  - `.github/workflows/publish.yml`
  - `.github/dependabot.yml`
  - `package.json` (check `engines` field)
  - `.mentall/cicd-setup.md`

**Write the implementation record** by replacing `04-implement/README.md` with:

1. **Status** — overall implementation status
2. **Quality Review**:
   - **Checklist**: all plan phases implemented, verification passed, no out-of-scope files modified, code follows project patterns, TypeScript strict mode maintained, docs proportional, no security vulnerabilities
   - **Documentation Proportionality** — assess if docs are appropriate for scope
   - **Issues Found** — list any issues or "None"
3. **Post-Implementation Recommendations** — build verification, manual testing areas (e.g., first tag push to test the pipeline)
4. **Change Summary** — list of all changed/created files with brief descriptions
5. **Recommended Commit Message** — conventional commits format:
   ```
   ??(??): ??

   - ??
   - ??
   ```

Use frontmatter: `title`, `date`, `status` (set to result), `feature`, `plan: "../03-plan/README.md"`.

---
