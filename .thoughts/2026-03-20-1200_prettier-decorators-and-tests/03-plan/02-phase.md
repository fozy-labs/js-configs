---
title: "Phase 2: Fixtures + Integration Tests"
date: 2026-03-20
stage: 03-plan
role: rdpi-planner
---

## Goal

Create two new fixture files and extend the integration test suite: add comprehensive import sorting test (T33) covering all 5 configured groups, add decorator + import sorting test (T34), and fix the T23 silent-skip guard (ADR-8). After this phase, the full test suite (32 existing + 2 new = 34 tests) passes.

## Dependencies

- **Requires**: Phase 1 (the `importOrderParserPlugins` config change must be in place for T34 to pass — without it, `prettier.format()` on a file with decorators throws `SyntaxError` from the import sorting plugin's Babel parser).
- **Blocks**: None (final phase).

## Execution

Sequential — depends on Phase 1 completion.

## Tasks

### Task 2.1: Create `all-groups-imports.ts` Fixture

- **File**: `@/src/__tests__/fixtures/prettier-project/all-groups-imports.ts`
- **Action**: Create
- **Description**: New fixture file with imports from all 5 configured import groups in intentionally wrong order. Used by T33 to validate the full import sorting behavior.
- **Details**:
  - Include one import from each group, in wrong order (not builtin → third-party → alias → relative-parent → local):
    - Local: `./local` (e.g., `import { something } from "./local"`)
    - Relative parent: `../../utils` (e.g., `import { util } from "../../utils"`)
    - Alias: `@/shared` (e.g., `import { shared } from "@/shared"`)
    - Third-party: `express` (e.g., `import express from "express"`)
    - Builtin: `node:fs` (e.g., `import { readFileSync } from "node:fs"`)
  - Each non-resolvable import must have `// @ts-ignore` above it (ADR-7), consistent with existing `unsorted-imports.ts`.
  - Include an export statement to make the file a valid module (e.g., `export {}`).
  - The intentionally wrong order ensures the import sorting plugin must rearrange them.
  - [ref: ../02-design/04-decisions.md#adr-4]
  - [ref: ../02-design/04-decisions.md#adr-7]
  - [ref: ../02-design/06-testcases.md#t33-new]

### Task 2.2: Create `decorator-imports.ts` Fixture

- **File**: `@/src/__tests__/fixtures/prettier-project/decorator-imports.ts`
- **Action**: Create
- **Description**: New fixture file with TC39 stage 3 decorators and unsorted imports. Used by T34 to verify that the import sorting plugin can parse decorator syntax without `SyntaxError`.
- **Details**:
  - Include at least 2 imports from different groups in wrong order (e.g., a local import before a builtin import).
  - Include a decorator function definition (e.g., `function log(target: any, context: ClassDecoratorContext) { return target; }`).
  - Include a class with a TC39 stage 3 decorator (e.g., `@log class MyService {}`). Must use TC39 syntax, not `experimentalDecorators`.
  - Each non-resolvable import must have `// @ts-ignore` above it (ADR-7).
  - [ref: ../02-design/04-decisions.md#adr-1]
  - [ref: ../02-design/04-decisions.md#adr-6]
  - [ref: ../02-design/04-decisions.md#adr-7]
  - [ref: ../02-design/06-testcases.md#t34-new]

### Task 2.3: Modify Integration Tests — T23 Fix, T33, T34

- **File**: `@/src/__tests__/integration.test.ts`
- **Action**: Modify
- **Description**: Three changes in the integration test file: (1) fix the T23 silent-skip guard, (2) add T33 comprehensive import sorting test, (3) add T34 decorator + import sorting test. All within the existing `describe("Prettier integration")` block.
- **Details**:

  **T23 guard fix (ADR-8)**:
  - Replace the conditional guard:
    ```typescript
    if (fsIndex !== -1 && expressIndex !== -1) {
        expect(fsIndex).toBeLessThan(expressIndex);
    }
    ```
  - With unconditional assertions:
    ```typescript
    expect(fsIndex).not.toBe(-1);
    expect(expressIndex).not.toBe(-1);
    expect(fsIndex).toBeLessThan(expressIndex);
    ```
  - This ensures T23 fails loudly if either import is missing from the formatted output.
  - [ref: ../02-design/04-decisions.md#adr-8]
  - [ref: ../02-design/06-testcases.md#t23-modified]

  **T33 — comprehensive import sorting with all 5 groups (ADR-4, ADR-5)**:
  - Add a new test case inside `describe("Prettier integration")`.
  - Read `all-groups-imports.ts` fixture, format with `prettier.format()` using the shared config.
  - Assertion approach (group-order assertion per ADR-5):
    1. Extract import lines from the formatted output (lines starting with `import`).
    2. Classify each import into its group by matching the import path:
       - Builtin: contains `node:` prefix.
       - Third-party: bare specifier, not `@/` prefixed.
       - Alias: starts with `@/`.
       - Relative parent: starts with `..`.
       - Local: starts with `./`.
    3. Assert groups appear in correct order: builtin < third-party < alias < relative-parent < local.
    4. Assert blank-line separators: between consecutive groups, the output has at least one empty line.
  - [ref: ../02-design/04-decisions.md#adr-5]
  - [ref: ../02-design/06-testcases.md#t33-new]

  **T34 — decorator + import sorting (ADR-6)**:
  - Add a new test case inside `describe("Prettier integration")`.
  - Read `decorator-imports.ts` fixture, format with `prettier.format()` using the shared config.
  - Assertions:
    1. `prettier.format()` completes without throwing (no `SyntaxError` from Babel — the core regression this task prevents).
    2. Output contains decorator syntax (e.g., the `@log` decorator is present).
    3. Imports in the output are sorted (at minimum, a builtin/third-party import appears before a local import).
  - [ref: ../02-design/04-decisions.md#adr-6]
  - [ref: ../02-design/06-testcases.md#t34-new]

## Verification

- [ ] `npm run ts-check` passes (no TypeScript errors from new fixtures or modified test file)
- [ ] `npx vitest run` passes — all 34 tests pass (32 existing + 2 new: T33, T34)
- [ ] T23 assertions are unconditional (manual code review — no `if` guard around assertions)
- [ ] T33 validates all 5 import groups in correct order with blank-line separators
- [ ] T34 confirms `prettier.format()` succeeds on a file with decorators and imports are sorted
- [ ] Negative verification (optional): temporarily remove `importOrderParserPlugins` from config, confirm T34 fails with `SyntaxError`
