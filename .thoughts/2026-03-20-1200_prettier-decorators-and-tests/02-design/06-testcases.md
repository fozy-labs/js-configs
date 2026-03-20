---
title: "Test Strategy: Prettier Decorator Support & Test Extension"
date: 2026-03-20
stage: 02-design
role: rdpi-qa-designer
workflow: b0.4
---

# Test Strategy

## Approach

The testing pyramid for this feature is bottom-heavy: the production change is a single config key addition, so **unit tests** validate the config shape, **integration tests** do the heavy lifting (verifying Prettier + plugin behavior with real formatting), and **snapshots** guard against unintended config drift. No end-to-end tests are needed — integrations already exercise the full Prettier pipeline.

- **Unit** (1 modified test): Config shape assertions in `prettier-config.test.ts`.
- **Integration** (2 new tests + 1 modified test): Real `prettier.format()` calls against fixture files, covering all 5 import groups, decorator+import sorting, and T23 guard fix.
- **Snapshot** (1 auto-updated): T16 Prettier config snapshot reflects the new `importOrderParserPlugins` key.

## Test Cases

| ID | Category | Description | Input | Expected Output | Priority |
|----|----------|-------------|-------|-----------------|----------|
| T6 (mod) | Unit | Config includes `importOrderParserPlugins` with correct value | `prettierConfig` object | `importOrderParserPlugins` is an array of length 3 containing `"typescript"`, `"jsx"`, and the decorators entry string | P1 |
| T16 (mod) | Snapshot | Prettier config snapshot updated with new key | `prettierConfig` object | Snapshot matches (auto-updated via `vitest --update`) | P1 |
| T23 (mod) | Integration | Fix silent-skip guard — assert imports exist before ordering check | `unsorted-imports.ts` fixture | `fsIndex !== -1`, `expressIndex !== -1`, `fsIndex < expressIndex` — all unconditional | P1 |
| T33 | Integration | All 5 import groups sorted with blank-line separators | `all-groups-imports.ts` fixture (new) | Groups appear in order: builtin → third-party → `@/` → `../` → `./`, with blank lines between groups | P1 |
| T34 | Integration | Import sorting works in file with TC39 decorators | `decorator-imports.ts` fixture (new) | No `SyntaxError`; imports sorted; decorator syntax preserved in output | P1 |

### Detailed Test Specifications

#### T6 (modified) — Config Shape: `importOrderParserPlugins`

- **File**: `@/src/prettier/__tests__/prettier-config.test.ts`
- **Change type**: Add assertions to existing test case T6.
- **Fixture**: None (tests the imported config object directly).
- **Assertions** [ref: [./01-architecture.md#2-change-inventory](./01-architecture.md#2-change-inventory)]:
  - `config.importOrderParserPlugins` is defined and is an array.
  - Array contains `"typescript"` and `"jsx"` (preserving plugin defaults — ADR-3).
  - Array length is 3 (typescript, jsx, decorators entry).
- **Note**: The existing assertions (`tabWidth`, `printWidth`, `plugins`, `importOrder.length === 9`) remain unchanged — none are affected by the new key.

#### T16 (modified) — Snapshot Update

- **File**: `@/src/__tests__/snapshots.test.ts` (code unchanged), `@/src/__tests__/__snapshots__/snapshots.test.ts.snap` (auto-updated).
- **Change type**: Snapshot file auto-updates when tests are run with `--update` after the config change.
- **Fixture**: None (snapshots the config object).
- **Assertion**: `expect(prettierConfig).toMatchSnapshot()` — same as before; only the snapshot file content changes to include the `importOrderParserPlugins` key.

#### T23 (modified) — Silent-Skip Guard Fix

- **File**: `@/src/__tests__/integration.test.ts`
- **Change type**: Replace the conditional guard with unconditional assertions [ref: [./04-decisions.md#adr-8](./04-decisions.md#adr-8-fix-t23s-silent-skip-guard)].
- **Fixture**: `@/src/__tests__/fixtures/prettier-project/unsorted-imports.ts` (unchanged).
- **Assertions**:
  - `expect(fsIndex).not.toBe(-1)` — `node:fs` import must be present in output.
  - `expect(expressIndex).not.toBe(-1)` — `express` import must be present in output.
  - `expect(fsIndex).toBeLessThan(expressIndex)` — unconditional ordering check.

#### T33 (new) — Comprehensive Import Sorting with All 5 Groups

- **File**: `@/src/__tests__/integration.test.ts` — new test case inside `describe("Prettier integration")`.
- **Change type**: New test.
- **Fixture**: `@/src/__tests__/fixtures/prettier-project/all-groups-imports.ts` (new file) [ref: [./04-decisions.md#adr-4](./04-decisions.md#adr-4-new-fixture-file-for-comprehensive-import-sorting-test)].
  - Contains imports from all 5 groups in intentionally wrong order.
  - Each non-builtin import has `@ts-ignore` (ADR-7).
  - Includes an export statement to make the file valid.
- **Assertion approach** (ADR-5 — group-order assertion):
  1. Format fixture via `prettier.format()` with the shared config.
  2. Extract import lines from the output (lines starting with `import`).
  3. Classify each import into one of the 5 groups by matching its path:
     - Builtin: matches `node:` prefix.
     - Third-party: no path prefix (bare specifier, not `@/`).
     - Alias: starts with `@/`.
     - Relative parent: starts with `..`.
     - Local: starts with `./`.
  4. Assert group order: builtin index < third-party index < alias index < relative-parent index < local index.
  5. Assert blank-line separators: between each group, the output has at least one empty line. Verify by checking that the line between the last import of group N and the first import of group N+1 is blank.
- **Priority**: P1 — directly validates the 5-group `importOrder` config that was previously untested.

#### T34 (new) — Decorator + Import Sorting

- **File**: `@/src/__tests__/integration.test.ts` — new test case inside `describe("Prettier integration")`.
- **Change type**: New test.
- **Fixture**: `@/src/__tests__/fixtures/prettier-project/decorator-imports.ts` (new file) [ref: [./04-decisions.md#adr-6](./04-decisions.md#adr-6-test-decorator--import-sorting-together)].
  - Contains a class with TC39 stage 3 decorator (`@decorator` syntax, not `experimentalDecorators`).
  - Contains unsorted imports from at least 2 different groups.
  - Uses `@ts-ignore` for unresolvable imports (ADR-7).
- **Assertions** [ref: [./05-usecases.md#uc-1](./05-usecases.md#uc-1-config-usage-with-decorators)]:
  1. `prettier.format()` completes without throwing (no `SyntaxError` from Babel).
  2. Output contains the decorator syntax (e.g., `@log` or similar is present in the output).
  3. Imports are sorted: at minimum, a builtin or third-party import appears before a local/relative import.
- **Priority**: P1 — directly validates the `importOrderParserPlugins` config change (the core of this task).

## Edge Cases

| Edge Case | Scenario | Test Strategy |
|-----------|----------|---------------|
| Side-effect imports | `import "reflect-metadata"` mixed with regular imports | Covered conceptually by UC-3/EC-3 [ref: [./05-usecases.md#ec-3](./05-usecases.md#ec-3-side-effect-imports-mixed-in)]. Not a separate test case — the import sorting plugin handles these as barriers. **P3**: could be added as a future test if regressions emerge. |
| Empty groups | Only 2 of 5 groups have imports | Already covered by the existing T23 fixture (has builtin, third-party, local — no `@/` or `../`). No extra blank lines should appear for empty groups. **P3**: no additional test needed. |
| Type-only imports | `import type { Foo } from "bar"` | The sorting plugin treats type-only imports like regular imports for ordering. Not a regression risk for this specific change. **P3**: future coverage opportunity. |
| Multiple decorators on a single class | `@dec1 @dec2 class Foo {}` | Covered by the same parsing pathway as single decorators. If `importOrderParserPlugins` handles one decorator, multiple decorators parse correctly too. No additional test needed. |
| `@ts-ignore` comment migration | Comments move with their associated import during sorting | Implicitly verified by T33 and T34 — if `@ts-ignore` didn't move with its import, the output would contain `@ts-ignore` before wrong lines. Not explicitly asserted — acceptable since this is plugin behavior, not our config. |

## Performance Criteria

Not applicable. This is a configuration change, not a runtime feature. Prettier formatting time is dominated by the plugin and is not affected by adding a parser plugin to the options. No performance thresholds defined.

## Correctness Verification

End-to-end validation approach:

1. **Run `vitest --update`** after implementing the config change to update the T16 snapshot.
2. **Run `vitest`** — all 34 tests (32 existing + 2 new) must pass.
3. **Manual check**: Verify the updated snapshot diff in `snapshots.test.ts.snap` contains only the expected `importOrderParserPlugins` addition.
4. **Negative verification**: Temporarily remove `importOrderParserPlugins` from the config and confirm T34 fails with a `SyntaxError` — proving the test actually validates the config change.
