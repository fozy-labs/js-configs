---
title: "Phases: 03-plan"
date: 2026-03-20
stage: 03-plan
---

# Phases: 03-plan

## Phase 1: Implementation Planning

- **Agent**: `rdpi-planner`
- **Output**: `README.md`, `01-phase.md`, `02-phase.md`, `03-phase.md` (number of phase files determined by planner)
- **Depends on**: —
- **Retry limit**: 2

### Prompt

You are planning the implementation of "Prettier Decorator Support and Test Extension" for the `js-configs` shared config package. Your task is to decompose the approved design into concrete, actionable implementation phases.

**Read these documents first (in order):**

1. Task description: `../TASK.md`
2. Research summary: `../01-research/README.md`
3. Design summary: `../02-design/README.md`
4. Architecture & change inventory: `../02-design/01-architecture.md`
5. Architecture decisions (ADRs 1–8): `../02-design/04-decisions.md`
6. Test cases (T6, T16, T23, T33, T34): `../02-design/06-testcases.md`
7. Risk analysis (R1–R8): `../02-design/08-risks.md`

**Before writing the plan, analyze:**

1. Map every design component to concrete files (create/modify/delete). The change inventory in `01-architecture.md` §2 lists all affected files — verify each path exists in the repository using search. The key files are:
   - `src/prettier/index.ts` — production config (modify)
   - `src/prettier/__tests__/prettier-config.test.ts` — unit tests T6 (modify)
   - `src/__tests__/snapshots.test.ts` — snapshot test T16 (unchanged code, snapshot auto-updates)
   - `src/__tests__/integration.test.ts` — integration tests T23, T33, T34 (modify)
   - `src/__tests__/__snapshots__/snapshots.test.ts.snap` — snapshot file (auto-updated)
   - `src/__tests__/fixtures/prettier-project/all-groups-imports.ts` — new fixture for T33 (create)
   - `src/__tests__/fixtures/prettier-project/decorator-imports.ts` — new fixture for T34 (create)
2. Identify dependencies between changes — the config change must happen before snapshot update; fixtures must exist before their tests run.
3. Determine which tasks can be parallelized vs. must be sequential.
4. Estimate per-task complexity (Low/Medium/High).
5. Define per-phase verification criteria (at minimum: `npm run ts-check` or `npx vitest run`).
6. Verify ALL file paths against the actual repository.

**Output structure:**

Create these files in the `03-plan/` directory:

1. **README.md** — Update the existing README.md with:
   - Phase map as a Mermaid dependency graph
   - Phase summary table (phase number, description, files affected, complexity, parallelizable)
   - Execution rules (what order phases must run, what can be parallel)
   - Do NOT add a Quality Review section — the reviewer will add that.

2. **Individual phase files** (`01-phase.md`, `02-phase.md`, etc.) — Each phase file must contain:
   - YAML frontmatter: `title`, `date`, `stage: 03-plan`, `role: rdpi-planner`
   - **Goal**: what this phase accomplishes
   - **Dependencies**: Requires (previous phases) / Blocks (subsequent phases)
   - **Execution**: Sequential or Parallel
   - **Tasks**: numbered list, each with:
     - Exact file path and action (Create/Modify/Delete)
     - Detailed description of the change
     - Design reference (which ADR, test case ID, or architecture section it implements)
   - **Verification**: checklist of commands/checks to confirm the phase is complete

**Constraints:**

- Every phase must leave the project in a compilable state (no broken imports, no syntax errors).
- Do not split trivial changes into separate phases — group related small changes together.
- The production config change (`src/prettier/index.ts`) and its snapshot update should be in the same phase.
- Fixture file creation and corresponding test additions should be in the same phase.
- The T23 guard fix (ADR-8) can be grouped with other integration test changes.
- The task includes "fix all currently failing tests" — include a baseline test run and any necessary fixes (snapshot updates, etc.) in the plan. Per R7 mitigation, run tests before changes to establish a baseline.
- Total implementation phases should be 2–4 (this is a small-to-medium task: 1 production file, 2 test files modified, 2 fixture files created).

---

## Phase 2: Plan Review

- **Agent**: `rdpi-plan-reviewer`
- **Output**: Updates `README.md`
- **Depends on**: 1
- **Retry limit**: 2

### Prompt

Review the implementation plan for "Prettier Decorator Support and Test Extension" produced by the planner.

**Read these documents:**

1. Plan README: `./README.md`
2. All phase files in this directory: list `./` and read all files matching `NN-*.md` (e.g., `01-phase.md`, `02-phase.md`, etc.)
3. Design documents for traceability:
   - `../02-design/README.md` — design summary with key decisions
   - `../02-design/01-architecture.md` — change inventory (§2) lists all files that must be covered
   - `../02-design/04-decisions.md` — ADRs 1–8 that the plan must implement
   - `../02-design/06-testcases.md` — test cases T6, T16, T23, T33, T34 that must appear in the plan
   - `../02-design/08-risks.md` — risk mitigations that should be reflected in phase ordering/verification

**Review criteria — check each and report Pass/Fail:**

1. Every design component from `01-architecture.md` §2 (Change Inventory) is mapped to at least one plan task.
2. File paths are concrete and verified (not placeholders) — all paths reference real repository files or clearly mark files to be created.
3. Dependencies between phases are correct (no phase reads an output that hasn't been produced yet).
4. Each phase has verification criteria (at minimum: type checking or test commands).
5. Each phase leaves the project in a compilable state.
6. No vague tasks — all tasks specify exact files and concrete changes.
7. Each task references the design section it implements (ADR number, test case ID, or architecture section).
8. Parallelizable vs. sequential tasks are correctly identified.
9. Per-task complexity estimates are present (Low/Medium/High).
10. Mermaid dependency graph present in README.md.
11. Phase summary table complete in README.md.
12. All 5 test cases (T6 mod, T16 mod, T23 mod, T33 new, T34 new) from `06-testcases.md` are covered in the plan.
13. Risk mitigations from `08-risks.md` are reflected (e.g., R3 — T23 guard fix ordering; R7 — baseline test run).

**After review, update `./README.md`:**

- Add a `## Quality Review` section at the end with:
  - A checklist table (criterion, status Pass/Fail, notes)
  - Any issues found with severity and recommended fixes
  - Set the `status` field in YAML frontmatter to `Draft`

---
