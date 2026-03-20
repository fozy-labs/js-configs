---
title: "Phase 1: Production Config + Unit & Snapshot Tests"
date: 2026-03-20
stage: 03-plan
role: rdpi-planner
---

## Goal

Deliver the core production change — adding `importOrderParserPlugins` with TC39 stage 3 decorator support to the Prettier config — and update the unit test (T6) and snapshot (T16) to reflect it. Establishes a working baseline before integration test changes.

## Dependencies

- **Requires**: None (first phase). A baseline test run (`npx vitest run`) should be performed before any changes to record current test state per R7 mitigation.
- **Blocks**: Phase 2 (integration tests depend on the config change being in place).

## Execution

Sequential — must complete and verify before Phase 2.

## Tasks

### Task 1.1: Baseline Test Run

- **Action**: Run `npx vitest run` before any code changes.
- **Description**: Execute the full test suite to capture a failure baseline. Record which tests pass and which fail. This is required per R7 mitigation — the user reports pre-existing test failures, and we need attribution (pre-existing vs. caused by our changes).
- **Details**:
  - If snapshot tests (T15–T18) fail due to staleness, note them — they will be fixed in Task 1.3.
  - If other tests fail, investigate briefly. If the failure is trivially fixable (e.g., stale snapshots), it will be resolved in this phase. If complex, flag to the user.
  - [ref: ../02-design/08-risks.md#r7-pre-existing-test-failures]

### Task 1.2: Add `importOrderParserPlugins` to Prettier Config

- **File**: `@/src/prettier/index.ts`
- **Action**: Modify
- **Description**: Add the `importOrderParserPlugins` property to the Prettier config object. This enables the `@ianvs/prettier-plugin-sort-imports` plugin to parse files containing TC39 stage 3 decorators via Babel.
- **Details**:
  - Add `importOrderParserPlugins: ["typescript", "jsx", '["decorators", { "decoratorsBeforeExport": true }]']` to the config object, after the `importOrder` property.
  - `"typescript"` and `"jsx"` preserve the plugin's defaults (ADR-3). The `"decorators"` entry with `decoratorsBeforeExport: true` enables TC39 stage 3 decorator parsing (ADR-1, ADR-2).
  - The value is a string containing a JSON array — this is the plugin's required API format for Babel plugin options.
  - The `Config` type import from `prettier` and the rest of the config remain unchanged.
  - [ref: ../02-design/01-architecture.md#2-change-inventory]
  - [ref: ../02-design/04-decisions.md#adr-1]
  - [ref: ../02-design/04-decisions.md#adr-2]
  - [ref: ../02-design/04-decisions.md#adr-3]

### Task 1.3: Add `importOrderParserPlugins` Assertion to Unit Test (T6)

- **File**: `@/src/prettier/__tests__/prettier-config.test.ts`
- **Action**: Modify
- **Description**: Add assertions to the existing T6 test case to verify the new `importOrderParserPlugins` property.
- **Details**:
  - Inside the existing `"exports correct config values"` test, add:
    - Assert `config.importOrderParserPlugins` is defined.
    - Assert it contains `"typescript"` and `"jsx"`.
    - Assert the array has length 3 (typescript, jsx, decorators entry).
  - Existing assertions (`tabWidth`, `printWidth`, `plugins`, `importOrder.length === 9`) remain unchanged — none are affected by the new key.
  - [ref: ../02-design/06-testcases.md#t6-modified]

### Task 1.4: Update Snapshot (T16)

- **Action**: Run `npx vitest run --update` to regenerate snapshots.
- **File**: `@/src/__tests__/__snapshots__/snapshots.test.ts.snap` (auto-updated)
- **Description**: The T16 snapshot captures the full Prettier config object. Adding `importOrderParserPlugins` changes the snapshot. Run vitest with `--update` flag to regenerate, then review the diff to confirm only the expected key was added.
- **Details**:
  - The code in `@/src/__tests__/snapshots.test.ts` does NOT change — only the `.snap` file updates.
  - Review the snapshot diff: it should contain only the new `importOrderParserPlugins` array with three entries. No other config values should change.
  - [ref: ../02-design/06-testcases.md#t16-modified]
  - [ref: ../02-design/08-risks.md#r1-snapshot-breakage]

## Verification

- [ ] `npm run ts-check` passes (no TypeScript errors after config modification)
- [ ] `npx vitest run` passes — T6 (with new assertions), T16 (updated snapshot), and all pre-existing tests pass
- [ ] Snapshot diff in `snapshots.test.ts.snap` contains only the `importOrderParserPlugins` addition
