---
title: "Architecture Decisions: Prettier Decorator Support & Test Extension"
date: 2026-03-20
stage: 02-design
role: rdpi-architect
workflow: b0.4
---

# Architecture Decisions

## ADR-1: `decorators` (TC39 Stage 3) for `importOrderParserPlugins`

### Status
Accepted

### Context
The `@ianvs/prettier-plugin-sort-imports` plugin uses Babel internally with default parser plugins `["typescript", "jsx"]`. Babel requires an explicit decorator plugin to parse files with decorator syntax — without it, the plugin throws `SyntaxError` [ref: [../01-research/02-external-research.md#2-import-sorting-plugins-use-babel-internally](../01-research/02-external-research.md#2-import-sorting-plugins-use-babel-internally)]. Babel offers two mutually exclusive options: `decorators-legacy` (TypeScript `experimentalDecorators`) and `decorators` (TC39 stage 3) [ref: [../01-research/02-external-research.md#pitfall-2](../01-research/02-external-research.md#2-decorators-legacy-vs-decorators--choosing-the-right-babel-plugin)].

The task explicitly specifies "ECMA stage 3" decorator support [ref: [../01-research/03-open-questions.md#q1](../01-research/03-open-questions.md#q1)]. The project's `tsconfig.base.json` does not set `experimentalDecorators`, which is consistent with TC39 stage 3 decorators (supported natively in TypeScript 5.0+) [ref: [../01-research/01-codebase-analysis.md#15-typescript-shared-configs](../01-research/01-codebase-analysis.md#15-typescript-shared-configs)].

### Options Considered
1. **`decorators-legacy`** — Maps to TypeScript `experimentalDecorators`. Simple config (no options object). Broadest ecosystem compatibility (NestJS, Angular, MobX). Contradicts the task's "stage 3" requirement.
2. **`decorators`** (with options) — Maps to TC39 stage 3. Requires nested JSON-in-string syntax. Aligns with task intent and `tsconfig.base.json`. Consumers using legacy decorators would get parse errors from the sorting plugin.

### Decision
Use `decorators` (TC39 stage 3) per user decision on Q1. The config entry will be `'["decorators", { "decoratorsBeforeExport": true }]'` (JSON string inside the array, as required by the plugin's API).

### Consequences
- **Positive**: Aligns with TC39 standard and the project's existing TypeScript config. Future-proof.
- **Negative**: Consumers using `experimentalDecorators: true` (NestJS, Angular) will encounter parse errors from the import sorting plugin on decorated files. They must override `importOrderParserPlugins` in their own Prettier config.
- **Risk**: Low — the shared config targets modern TypeScript projects; legacy decorator users are a diminishing minority.

---

## ADR-2: `decoratorsBeforeExport: true`

### Status
Accepted

### Context
The `decorators` Babel parser plugin requires a `decoratorsBeforeExport` option. TC39 allows decorators both before and after `export` (`@dec export class` vs `export @dec class`), but Babel needs a default parsing mode [ref: [../01-research/03-open-questions.md#q9](../01-research/03-open-questions.md#q9)].

### Options Considered
1. **`true`** — Parses `@dec export class Foo {}`. Matches the dominant convention in TypeScript codebases and resembles legacy decorator syntax.
2. **`false`** — Parses `export @dec class Foo {}`. Technically valid per TC39 but rarely used in practice.

### Decision
Use `decoratorsBeforeExport: true` per the researcher recommendation on Q9. Virtually all real-world TypeScript code places decorators before `export`.

### Consequences
- **Positive**: Handles the overwhelmingly common decorator syntax pattern.
- **Negative**: Files using `export @dec class` syntax will fail to parse in the import sorting plugin. This is an extremely rare edge case.

---

## ADR-3: Include `"jsx"` in `importOrderParserPlugins`

### Status
Accepted

### Context
The plugin's default `importOrderParserPlugins` is `["typescript", "jsx"]` [ref: [../01-research/02-external-research.md#2-import-sorting-plugins-use-babel-internally](../01-research/02-external-research.md#2-import-sorting-plugins-use-babel-internally)]. When explicitly setting this option (to add `"decorators"`), we must decide whether to preserve `"jsx"` or drop it. The project itself exports `.ts` configs and has no `.jsx`/`.tsx` fixtures, but this is a *shared* config used by consumer projects that may contain JSX/TSX files.

### Options Considered
1. **Include `"jsx"`** — `["typescript", "jsx", ...]`. Preserves the default behavior. Consumers with `.tsx` files are not affected.
2. **Omit `"jsx"`** — `["typescript", ...]`. Simpler array. Consumers with JSX files would get parse errors from the import sorting plugin on those files.

### Decision
Include `"jsx"` to preserve parity with the plugin's default. The full value is `["typescript", "jsx", '["decorators", { "decoratorsBeforeExport": true }]']`. Dropping `"jsx"` would be a silent breaking change for any consumer with JSX/TSX files.

### Consequences
- **Positive**: No breaking change for JSX/TSX consumers. Matches the plugin's documented default.
- **Negative**: None significant — `"jsx"` is a lightweight Babel parser plugin with no side effects on non-JSX files.

---

## ADR-4: New Fixture File for Comprehensive Import Sorting Test

### Status
Accepted

### Context
The existing `unsorted-imports.ts` fixture has 3 imports covering only 2 of the 5 configured groups (builtin, third-party, local). The task requires testing all 5 groups: `<BUILTIN_MODULES>`, `<THIRD_PARTY_MODULES>`, `^@/(.*)$`, `^\\.\\.(.*)`, `^\\./(.*)$` [ref: [../01-research/03-open-questions.md#q4](../01-research/03-open-questions.md#q4)]. The existing T23 test has a silent-skip guard that masks failures [ref: [../01-research/01-codebase-analysis.md#3-integration-tests](../01-research/01-codebase-analysis.md#3-integration-tests)].

### Options Considered
1. **Extend existing fixture** — Add missing import patterns to `unsorted-imports.ts`. Risk: T23's `indexOf` assertions depend on the current 3 imports; changing the fixture breaks T23 or requires rewriting its assertions.
2. **Create new fixture** (`all-groups-imports.ts`) — Dedicated fixture with all 5 groups in wrong order. Add a new test case. Leave `unsorted-imports.ts` and T23 intact (but fix the guard separately — see ADR-8).
3. **Replace existing fixture** — Delete `unsorted-imports.ts`, create comprehensive replacement. Risk: must rewrite T23 completely; single point of failure.

### Decision
Option 2 — create a new fixture file `all-groups-imports.ts` with a new test case. The existing fixture and T23 remain as a basic smoke test (with the guard fixed per ADR-8). The new fixture provides comprehensive coverage of all 5 import groups with blank-line separator verification.

### Consequences
- **Positive**: Clean separation; existing test remains stable; new test covers all groups thoroughly.
- **Negative**: One additional fixture file in the project (minor — the fixture directory already has multiple files).

---

## ADR-5: Group-Order Assertion for Import Sorting Tests

### Status
Accepted

### Context
T23 currently uses `indexOf` comparison on two imports — a fragile approach that doesn't verify blank-line separators or the full 5-group ordering [ref: [../01-research/03-open-questions.md#q5](../01-research/03-open-questions.md#q5)]. The new comprehensive test needs a robust assertion strategy.

### Options Considered
1. **Line-by-line regex matching** — Precise but brittle to minor Prettier formatting changes. Verbose test code.
2. **Snapshot testing** — Captures exact output including blank lines. Easy to write but opaque — changes require manual review, noisy on Prettier version bumps.
3. **Group-order assertion** — Extract import paths from output via regex, classify each into its group, assert groups appear in the correct order. Decoupled from exact formatting.
4. **Combination** (snapshot + targeted assertions) — Best coverage but redundant.

### Decision
Option 3 — group-order assertion. Extract import lines from the formatted output, map each to its expected group via pattern matching, and assert:
- All 5 groups are present in the correct order.
- Blank lines separate adjacent groups.

This tests the semantic behavior (import ordering) without coupling to Prettier's exact text output. Additionally, for the decorator test, a simple assertion that the output contains the decorator and that imports are sorted is sufficient.

### Consequences
- **Positive**: Resilient to minor Prettier formatting changes (whitespace, semicolons). Tests the actual sorting logic, not cosmetic output.
- **Negative**: Slightly more test code than a snapshot. Does not catch cosmetic regressions (acceptable — that's Prettier's job, not the config's).

---

## ADR-6: Test Decorator + Import Sorting Together

### Status
Accepted

### Context
Prettier already formats decorators natively via its TypeScript parser — no config change is needed for decorator *formatting* [ref: [../01-research/02-external-research.md#1-prettiers-decorator-support-is-built-in](../01-research/02-external-research.md#1-prettiers-decorator-support-is-built-in--no-plugin-needed)]. The actual change (`importOrderParserPlugins`) fixes the import sorting plugin's Babel parser, which would otherwise throw `SyntaxError` on decorator files [ref: [../01-research/03-open-questions.md#q7](../01-research/03-open-questions.md#q7)].

### Options Considered
1. **Test decorator formatting only** — Proves Prettier handles decorators. Doesn't test the actual config change.
2. **Test import sorting in files with decorators** — Directly validates `importOrderParserPlugins`. Proves the sorting plugin doesn't choke on decorator syntax.
3. **Both** — Comprehensive but partially redundant (option 1 tests existing behavior, not our change).

### Decision
Option 2 — test import sorting in a file that also contains decorators. This directly validates the config change. The fixture (`decorator-imports.ts`) will contain a class with TC39 stage 3 decorators and unsorted imports. The test asserts that:
- Formatting completes without error (no `SyntaxError` from Babel).
- Imports are correctly sorted.
- Decorator syntax is preserved in the output.

### Consequences
- **Positive**: Directly tests the regression scenario — exactly what would fail without `importOrderParserPlugins`.
- **Negative**: Does not test decorator formatting edge cases (e.g., decorator with arguments, multiple decorators). Acceptable — Prettier's own test suite covers formatting; we only need to verify the parsing pipeline.

---

## ADR-7: `@ts-ignore` for Test Fixture Imports

### Status
Accepted

### Context
Fixture files import from non-existent modules (`./local`, `express`, `@/shared`, etc.). TypeScript would report errors on these imports. The existing fixture uses `// @ts-ignore` [ref: [../01-research/03-open-questions.md#q8](../01-research/03-open-questions.md#q8)]. The `@ianvs/prettier-plugin-sort-imports` plugin preserves comments attached to imports (moves them with the import during sorting).

### Options Considered
1. **`@ts-ignore`** — Current approach. Consistent with existing fixture. Suppresses all TS errors on the next line.
2. **`@ts-expect-error`** — Stricter: fails if there's no error (self-documenting). Preferred in production code but unnecessary for fixtures that will never be compiled.
3. **Exclude fixtures from TypeScript checking** — The fixture directory is already excluded from Vitest (`src/__tests__/fixtures/**` in `vitest.config.ts`). If it's also excluded from `tsc` compilation, no suppression comments are needed.

### Decision
Use `@ts-ignore` for consistency with the existing `unsorted-imports.ts` fixture. Fixtures are not compiled; the comments serve only to suppress IDE diagnostics. `@ts-expect-error` adds no value here since fixtures intentionally reference non-existent modules.

**Note**: Comments will be attached to imports. The import sorting plugin preserves inline comments attached to import statements, so `@ts-ignore` lines move with their associated import during sorting. This is the desired behavior — each import retains its suppression.

### Consequences
- **Positive**: Consistent with existing convention. No fixture infrastructure changes needed.
- **Negative**: `@ts-ignore` is less strict than `@ts-expect-error`. Acceptable for non-compiled test fixtures.

---

## ADR-8: Fix T23's Silent-Skip Guard

### Status
Accepted

### Context
T23 ("sorts imports correctly via plugin") uses this guard [ref: [../01-research/01-codebase-analysis.md#3-integration-tests](../01-research/01-codebase-analysis.md#3-integration-tests)]:

```typescript
if (fsIndex !== -1 && expressIndex !== -1) {
    expect(fsIndex).toBeLessThan(expressIndex);
}
```

If either `node:fs` or `express` is missing from the formatted output (e.g., due to a plugin error), the assertion is silently skipped and the test passes. This is a latent defect — it masks real failures.

### Options Considered
1. **Fix as part of this task** — Replace the conditional guard with unconditional assertions. Ensure both imports exist in the output before asserting their order.
2. **Defer to a separate task** — Leave T23 as-is, address later. Risk: the defect continues to mask regressions.

### Decision
Fix as part of this task. The guard will be replaced with explicit presence assertions followed by the ordering assertion:

```typescript
expect(fsIndex).not.toBe(-1);
expect(expressIndex).not.toBe(-1);
expect(fsIndex).toBeLessThan(expressIndex);
```

This is a minimal, low-risk change that directly improves test reliability.

### Consequences
- **Positive**: T23 now fails loudly if imports are missing from the output — catches regressions that were previously hidden.
- **Negative**: None. The fix is three lines and purely corrective.
