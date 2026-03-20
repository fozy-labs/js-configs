---
title: "Phases: 03-plan"
date: 2026-03-20
stage: 03-plan
---

# Phases: 03-plan

## Phase 1: Implementation Planning

- **Agent**: `rdpi-planner`
- **Output**: `README.md`, `01-phase.md` ... `NN-phase.md`
- **Depends on**: —
- **Retry limit**: 2

### Prompt

You are planning the implementation of a GitHub Actions CI/CD pipeline for publishing the `@fozy-labs/js-configs` npm package.

**Read these documents first (in order):**

1. Task: `../TASK.md`
2. Research summary: `../01-research/README.md`
3. Design summary: `../02-design/README.md`
4. Architecture (primary reference): `../02-design/01-architecture.md` — contains CI workflow structure, Publish workflow structure, Dependabot config, package.json changes, permissions model, SHA-pinned actions
5. Data flow: `../02-design/02-dataflow.md` — sequence diagrams for all scenarios
6. Decisions: `../02-design/04-decisions.md` — 7 ADRs explaining why each choice was made
7. Use cases: `../02-design/05-usecases.md` — 4 developer workflows
8. Test cases: `../02-design/06-testcases.md` — 30 test cases for verification reference
9. Documentation impact: `../02-design/07-docs.md` — structure for setup guide
10. Risks: `../02-design/08-risks.md` — 18 risks with mitigations

**Before writing the plan, perform this analysis:**

1. Map every design component to concrete files to create or modify. The deliverables are:
   - Create `.github/workflows/ci.yml` — CI checks workflow (ts-check, format:check, lint, test)
   - Create `.github/workflows/publish.yml` — npm publish workflow via `workflow_run` (checkout at head_sha, setup-node with registry-url, npm ci, build, npm publish --provenance)
   - Create `.github/dependabot.yml` — weekly GitHub Actions version updates
   - Modify `package.json` — add `engines` field (`node >=22.0.0`, `npm >=10.0.0`)
   - Create `.mentall/cicd-setup.md` — setup guide in Russian (7 sections per 07-docs.md)
2. Identify dependencies between changes (e.g., ci.yml must exist before publish.yml can reference it via workflow_run)
3. Determine which tasks can be parallel vs. sequential
4. Estimate per-task complexity (Low/Medium/High)
5. Define verification criteria for each phase
6. **Verify ALL file paths against the actual repository** — use search to confirm that `package.json`, `tsconfig.json`, etc. exist at the expected paths. Note: `.github/workflows/`, `.github/dependabot.yml`, `.mentall/` directories do NOT exist yet and will be created.

**Output requirements:**

Update `README.md` in this directory (03-plan/) with:
- Overview section
- Phase Map: Mermaid dependency graph showing phase relationships
- Phase Summary: table with columns (Phase, Description, Files, Complexity, Parallel)
- Execution Rules: sequential/parallel guidance
- Next Steps

Create individual phase files (`NN-phase.md`) with:
- Frontmatter: title, date, stage (03-plan), role (rdpi-planner)
- Goal: what this phase accomplishes
- Dependencies: Requires / Blocks
- Execution: Sequential or Parallel with other phases
- Tasks: each task specifies exact file path, action (Create/Modify), detailed description of what to implement, and a `[ref: ...]` pointer to the design section it implements
- Verification: checklist of checks to run after phase completion (minimum: `npm run ts-check`)

**Constraints:**
- Every phase must leave the project in a compilable state (`npm run ts-check` must pass)
- No vague tasks — each task must specify exact files and concrete changes
- Don't over-split: this is a small implementation (~5 files). Group logically related changes. Expect 2–4 phases total.
- Reference design sections using `[ref: 02-design/01-architecture.md §N]` format
- Include documentation impact: the setup guide is a single `.mentall/cicd-setup.md` file (gitignored, local reference). No changes to existing `docs/CHANGELOG.md` or `README.md`.
- The `engines` field addition to `package.json` is a trivial change — group it with another phase rather than making it a standalone phase.

**Key design details to reflect in the plan:**
- CI workflow: triggers on `push` (branches: main, tags: v*) and `pull_request` (branches: main). Steps: checkout → setup-node (22.x, npm cache) → npm ci → parallel or sequential: ts-check, format:check, lint, test. Permissions: contents read.
- Publish workflow: triggers on `workflow_run` (workflows: CI, types: completed). Conditions: workflow_run success + tag ref. Steps: checkout at `github.event.workflow_run.head_sha` → setup-node (22.x, registry-url: https://registry.npmjs.org) → npm ci → build → npm publish --provenance --access public. Permissions: contents read, id-token write. Environment: npm-publish.
- All actions SHA-pinned (actual SHAs to be looked up during implementation)
- Dependabot: weekly updates for github-actions ecosystem
- Setup guide: 7 sections in Russian, minimal style, per `../02-design/07-docs.md`

---

## Phase 2: Plan Review

- **Agent**: `rdpi-plan-reviewer`
- **Output**: Updates `README.md`
- **Depends on**: 1
- **Retry limit**: 2

### Prompt

Review the implementation plan for the GitHub CI/CD NPM publishing feature.

**Read these files:**

1. Plan README: `./README.md` (in `03-plan/`)
2. All phase files in `03-plan/`: list the directory and read every `NN-*.md` file (excluding this PHASES.md)
3. Design README: `../02-design/README.md`
4. Architecture: `../02-design/01-architecture.md`
5. Data flow: `../02-design/02-dataflow.md`
6. Decisions: `../02-design/04-decisions.md`
7. Use cases: `../02-design/05-usecases.md`
8. Test cases: `../02-design/06-testcases.md`
9. Documentation impact: `../02-design/07-docs.md`
10. Risk analysis: `../02-design/08-risks.md`

**Review Criteria — check each item:**

1. **Design traceability**: Every component from the design (ci.yml, publish.yml, dependabot.yml, package.json engines, setup guide) is mapped to at least one plan task
2. **File paths concrete**: All file paths are real and verified (not placeholders)
3. **Dependency correctness**: Phase dependencies reflect actual data flow (e.g., publish.yml references ci.yml workflow name, so ci.yml should come first or in the same phase)
4. **Verification criteria**: Each phase has a verification checklist; minimum `npm run ts-check`
5. **Compilable state**: Each phase leaves the project in a state where `npm run ts-check` passes
6. **No vague tasks**: All tasks specify exact changes (no "implement the workflow" without details)
7. **Design references**: Each task has a `[ref: ...]` pointer to the design section it implements
8. **Parallelization**: Parallel vs. sequential marking is correct
9. **Complexity estimates**: Per-task complexity present (Low/Medium/High)
10. **Documentation proportionality**: Setup guide (`cicd-setup.md`) is a single file; no excessive doc tasks
11. **Mermaid diagram**: README.md contains a phase dependency graph
12. **Phase summary table**: README.md contains a complete summary table
13. **Completeness cross-check**: Verify against the 30 test cases in `../02-design/06-testcases.md` — the plan should cover what's needed to pass all test cases

**After review, update `README.md` in `03-plan/`:**
- Add a `## Quality Review` section with:
  - Checklist table (criterion, status PASS/FAIL, notes)
  - Issues Found (numbered, with severity)
  - Verdict: "Approved" or "Not Approved" with reasoning
- Set `status` in frontmatter to `Draft`

---
