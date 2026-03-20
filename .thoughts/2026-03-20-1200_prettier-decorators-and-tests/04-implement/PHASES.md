---
title: "Phases: 04-implement"
date: 2026-03-20
stage: 04-implement
---

# Phases: 04-implement

## Phase 1: Implement Plan Phase 1 — Config Change + Unit & Snapshot Tests

- **Agent**: `rdpi-codder`
- **Output**: Code changes per ../03-plan/01-phase.md
- **Depends on**: —
- **Retry limit**: 2

### Prompt

You are implementing Phase 1 of the plan for adding decorator support to the Prettier config.

**Read these files first:**
- Plan phase: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\03-plan\01-phase.md`
- Task description: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\TASK.md`
- Design architecture: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\02-design\01-architecture.md`
- Design decisions: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\02-design\04-decisions.md`

**Before making any changes**, run `npx vitest run` to capture the baseline test state (Task 1.1 per R7 mitigation). Record which tests pass and which fail.

**Then implement these tasks in order:**

1. **Task 1.2 — Modify `src/prettier/index.ts`**: Add the `importOrderParserPlugins` property to the Prettier config object, after the `importOrder` property. The value must be: `["typescript", "jsx", '["decorators", { "decoratorsBeforeExport": true }]']`. Read the existing file first to match code style exactly (indentation, trailing commas, etc.).

2. **Task 1.3 — Modify `src/prettier/__tests__/prettier-config.test.ts`**: Inside the existing `"exports correct config values"` test, add assertions for the new `importOrderParserPlugins` property:
   - Assert `config.importOrderParserPlugins` is defined.
   - Assert it contains `"typescript"` and `"jsx"`.
   - Assert the array has length 3.
   Read the existing test file first to match assertion style and patterns.

3. **Task 1.4 — Update snapshots**: Run `npx vitest run --update` to regenerate the snapshot file `src/__tests__/__snapshots__/snapshots.test.ts.snap`. Review the diff — it should only contain the new `importOrderParserPlugins` key with three entries.

**Constraints:**
- Follow existing code patterns precisely (naming, indentation, trailing commas, `@/` alias).
- Maintain TypeScript strict mode compatibility.
- Do NOT modify files outside Phase 1 scope (only `src/prettier/index.ts`, `src/prettier/__tests__/prettier-config.test.ts`, and the auto-updated snapshot file).
- If `ts-check` fails after implementation, fix within scope (max 2 attempts).

---

## Phase 2: Verify Plan Phase 1 Implementation

- **Agent**: `rdpi-tester`
- **Output**: `verification-1.md`
- **Depends on**: Phase 1
- **Retry limit**: 1

### Prompt

You are verifying the Phase 1 implementation (config change + unit & snapshot tests) for the Prettier decorator support feature.

**Read the plan phase for verification criteria:**
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\03-plan\01-phase.md` (see "Verification" section at the end)

**Run these checks:**

1. **TypeScript compilation**: Run `npm run ts-check`. Report pass/fail.
2. **Full test suite**: Run `npx vitest run`. Report pass/fail, listing any failing tests with error details.
3. **Snapshot diff review**: Read `src/__tests__/__snapshots__/snapshots.test.ts.snap` and verify the snapshot contains the `importOrderParserPlugins` property with exactly three entries: `"typescript"`, `"jsx"`, and the decorators JSON string. Confirm no unrelated snapshot changes occurred.
4. **Code review of `src/prettier/index.ts`**: Confirm `importOrderParserPlugins` is present with the correct value: `["typescript", "jsx", '["decorators", { "decoratorsBeforeExport": true }]']`.
5. **Code review of `src/prettier/__tests__/prettier-config.test.ts`**: Confirm assertions for `importOrderParserPlugins` exist (defined, contains typescript/jsx, length 3).

**Save the verification report to:**
`d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\04-implement\verification-1.md`

Format: pass/fail per check, error details if failed.

If tests fail, report to the orchestrator — do not attempt fixes.

---

## Phase 3: Implement Plan Phase 2 — Fixtures + Integration Tests

- **Agent**: `rdpi-codder`
- **Output**: Code changes per ../03-plan/02-phase.md
- **Depends on**: Phase 2
- **Retry limit**: 2

### Prompt

You are implementing Phase 2 of the plan for extending import sorting tests and fixing the T23 guard.

**Read these files first:**
- Plan phase: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\03-plan\02-phase.md`
- Task description: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\TASK.md`
- Design architecture: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\02-design\01-architecture.md`
- Design decisions: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\02-design\04-decisions.md`
- Design test cases: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\02-design\06-testcases.md`

**Also read these existing files to match patterns:**
- `src/__tests__/integration.test.ts` — the file you will modify; understand its structure, imports, and test patterns
- `src/__tests__/fixtures/prettier-project/unsorted-imports.ts` — existing fixture file; match its style for `@ts-ignore` usage

**Implement these tasks in order:**

1. **Task 2.1 — Create `src/__tests__/fixtures/prettier-project/all-groups-imports.ts`**: New fixture with imports from all 5 configured groups in intentionally wrong order. Include one import from each group:
   - Local: `./local`
   - Relative parent: `../../utils`
   - Alias: `@/shared`
   - Third-party: `express`
   - Builtin: `node:fs`
   Each non-resolvable import needs `// @ts-ignore` above it (ADR-7). Include `export {}` at the end. The imports must be in WRONG order so the sorting plugin rearranges them.

2. **Task 2.2 — Create `src/__tests__/fixtures/prettier-project/decorator-imports.ts`**: New fixture with TC39 stage 3 decorators and unsorted imports. Include:
   - At least 2 imports from different groups in wrong order (e.g., local before builtin).
   - A decorator function definition (e.g., `function log(target: any, context: ClassDecoratorContext) { return target; }`).
   - A class using TC39 stage 3 decorator syntax (e.g., `@log class MyService {}`).
   - `// @ts-ignore` above non-resolvable imports (ADR-7).

3. **Task 2.3 — Modify `src/__tests__/integration.test.ts`**: Three changes inside the `describe("Prettier integration")` block:
   
   **(a) Fix T23 guard** (ADR-8): Find the conditional guard pattern:
   ```typescript
   if (fsIndex !== -1 && expressIndex !== -1) {
       expect(fsIndex).toBeLessThan(expressIndex);
   }
   ```
   Replace with unconditional assertions:
   ```typescript
   expect(fsIndex).not.toBe(-1);
   expect(expressIndex).not.toBe(-1);
   expect(fsIndex).toBeLessThan(expressIndex);
   ```
   
   **(b) Add T33** — comprehensive import sorting test: New test case that reads `all-groups-imports.ts`, formats with `prettier.format()` using the shared config, then:
   - Extracts import lines from formatted output
   - Asserts groups appear in correct order: builtin < third-party < alias < relative-parent < local
   - Asserts blank-line separators between groups
   
   **(c) Add T34** — decorator + import sorting test: New test case that reads `decorator-imports.ts`, formats with `prettier.format()` using the shared config, then:
   - Asserts `prettier.format()` completes without throwing (no SyntaxError)
   - Asserts output contains decorator syntax (`@log`)
   - Asserts imports are sorted (builtin/third-party before local)

**After all changes**, run `npx vitest run` to confirm all 34 tests pass.

**Constraints:**
- Follow existing code patterns exactly (read existing tests for import style, describe/it nesting, assertion patterns).
- Maintain TypeScript strict mode compatibility.
- Do NOT modify files outside Phase 2 scope.
- If `ts-check` fails, fix within scope (max 2 attempts).

---

## Phase 4: Verify Plan Phase 2 Implementation

- **Agent**: `rdpi-tester`
- **Output**: `verification-2.md`
- **Depends on**: Phase 3
- **Retry limit**: 1

### Prompt

You are verifying the Phase 2 implementation (fixtures + integration tests) for the Prettier decorator support feature.

**Read the plan phase for verification criteria:**
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\03-plan\02-phase.md` (see "Verification" section at the end)

**Run these checks:**

1. **TypeScript compilation**: Run `npm run ts-check`. Report pass/fail.
2. **Full test suite**: Run `npx vitest run`. Report pass/fail. Confirm the total test count is 34 (32 existing + 2 new). List any failing tests with error details.
3. **T23 guard review**: Read `src/__tests__/integration.test.ts` and find the import sorting test (T23). Confirm there is NO `if` guard around the assertions — all `expect()` calls must be unconditional.
4. **T33 validation**: Confirm the new T33 test exists, reads `all-groups-imports.ts`, and validates all 5 import groups in correct order with blank-line separators between groups.
5. **T34 validation**: Confirm the new T34 test exists, reads `decorator-imports.ts`, and asserts: (a) no SyntaxError thrown, (b) decorator syntax preserved, (c) imports sorted.
6. **Fixture review**: Read both new fixtures:
   - `src/__tests__/fixtures/prettier-project/all-groups-imports.ts` — confirm imports from all 5 groups in wrong order, `@ts-ignore` comments present.
   - `src/__tests__/fixtures/prettier-project/decorator-imports.ts` — confirm TC39 decorators, unsorted imports, `@ts-ignore` comments present.

**Save the verification report to:**
`d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\04-implement\verification-2.md`

Format: pass/fail per check, error details if failed.

If tests fail, report to the orchestrator — do not attempt fixes.

---

## Phase 5: Implementation Review

- **Agent**: `rdpi-implement-reviewer`
- **Output**: Updates `README.md`
- **Depends on**: Phase 2, Phase 4
- **Retry limit**: 2

### Prompt

You are the implementation reviewer for the Prettier decorator support and test extension feature.

**Read these files to understand the full context:**

- Task: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\TASK.md`
- Research summary: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\01-research\README.md`
- Design summary: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\02-design\README.md`
- Plan summary: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\03-plan\README.md`
- Plan Phase 1: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\03-plan\01-phase.md`
- Plan Phase 2: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\03-plan\02-phase.md`
- Verification report 1: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\04-implement\verification-1.md`
- Verification report 2: `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\04-implement\verification-2.md`

**Read the actual changed source files:**
- `src/prettier/index.ts`
- `src/prettier/__tests__/prettier-config.test.ts`
- `src/__tests__/integration.test.ts`
- `src/__tests__/__snapshots__/snapshots.test.ts.snap`
- `src/__tests__/fixtures/prettier-project/all-groups-imports.ts`
- `src/__tests__/fixtures/prettier-project/decorator-imports.ts`

**Write the final `README.md`** at `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1200_prettier-decorators-and-tests\04-implement\README.md`, replacing the existing placeholder. Include:

1. **Frontmatter**: title, date (2026-03-20), status (Approved or Issues), feature description, plan link (`../03-plan/README.md`), rdpi-version (b0.2).
2. **Implementation record**: Date, plan link, phase completion (2/2).
3. **Verification results summary**: Summarize verification-1.md and verification-2.md.
4. **Quality review checklist**:
   - All plan phases implemented
   - All verifications passed
   - No out-of-scope files modified
   - Code follows project patterns (naming, indentation, barrel exports, `@/` alias)
   - TypeScript strict mode compatibility
   - No security vulnerabilities introduced
   - Documentation proportional to existing docs (N/A for this feature — no external API changes)
5. **Changed files list**: All files created or modified.
6. **Post-implementation recommendations**: Build verification, manual testing areas.
7. **Recommended commit message** in conventional commits format:
   ```
   ??(??): ??

   - ??
   - ??
   ```

---
