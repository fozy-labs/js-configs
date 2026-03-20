---
title: "Risk Analysis: Prettier Decorator Support & Test Extension"
date: 2026-03-20
stage: 02-design
role: rdpi-qa-designer
workflow: b0.4
---

# Risk Analysis

## Risk Matrix

| ID | Risk | Probability | Impact | Strategy | Mitigation |
|----|------|-------------|--------|----------|------------|
| R1 | Snapshot breakage: T16 fails after adding `importOrderParserPlugins` | High | Low | Accept | Run `vitest --update`, review diff, commit updated snapshot. |
| R2 | T6 config shape test needs updating | Low | Low | Accept | T6 asserts `importOrder.length === 9` — unaffected. New assertions are additive. No existing assertion breaks. |
| R3 | T23 silent-skip guard fix exposes a pre-existing failure | Medium | Medium | Mitigate | See detailed plan below. |
| R4 | Consumer compatibility: `decorators-legacy` users get parse errors | Low | Medium | Accept | Documented in ADR-1 consequences. Consumers override `importOrderParserPlugins` in their Prettier config. |
| R5 | Babel parser plugin interaction: `decorators` + `typescript` conflict | Low | High | Mitigate | See detailed plan below. |
| R6 | `@ts-ignore` comments affect import sorting behavior | Low | Low | Accept | Plugin preserves comments attached to imports (documented behavior). Implicitly verified by T33/T34 assertions. |
| R7 | Pre-existing test failures unrelated to this task | Medium | Medium | Mitigate | See detailed plan below. |
| R8 | Plugin version: `@ianvs/prettier-plugin-sort-imports ^4.4.0` doesn't support `importOrderParserPlugins` with `decorators` | Low | High | Mitigate | See detailed plan below. |

## Detailed Mitigation Plans

### R3: T23 Guard Fix Exposes Pre-Existing Failure

**Risk**: Replacing the `if (fsIndex !== -1 && expressIndex !== -1)` guard with unconditional assertions may reveal that T23 was silently passing despite broken import sorting. If the sorting plugin is misconfigured or the fixture is malformed, removing the guard turns a passing test into a failing one.

**Probability**: Medium — the guard was added for a reason (possibly to work around a known issue during development). However, the plugin is currently sorting correctly in T22's integration test context, and the fixture is simple.

**Impact**: Medium — a failing T23 blocks the test suite, but the fix is straightforward (investigate why imports are missing from the output, fix the root cause).

**Mitigation steps**:
1. **Implement the guard fix first**, before adding new tests T33/T34.
2. Run `vitest` immediately after the guard fix to check if T23 passes.
3. If T23 fails:
   - Inspect the formatted output of `unsorted-imports.ts` — are imports present? Are they sorted?
   - If the plugin is erroring, the `importOrderParserPlugins` change (the main task) likely fixes it.
   - Apply the config change, re-run T23.
4. If T23 still fails after the config change, debug the fixture (`unsorted-imports.ts`) and the Prettier plugin configuration individually.

**Verification**: T23 passes unconditionally with the guard removed.

---

### R5: Babel `decorators` + `typescript` Plugin Interaction

**Risk**: The `decorators` Babel plugin (TC39 stage 3) might conflict with the `typescript` Babel plugin in edge cases. Babel documentation states they're compatible, but undocumented interactions could cause parse failures on specific syntax combinations (e.g., decorators on abstract methods, parameter decorators).

**Probability**: Low — `["typescript", "jsx", "decorators"]` is a common Babel plugin combination documented in the `@ianvs/prettier-plugin-sort-imports` README. The plugin's test suite uses this combination.

**Impact**: High — if the plugins conflict, files with decorators fail to format, which is the exact scenario this task is supposed to fix.

**Mitigation steps**:
1. The T34 test fixture includes a decorated class with a decorator and imports — this directly exercises the plugin combination.
2. If T34 fails with a Babel parse error:
   - Check the exact error message — Babel usually reports which plugins conflict.
   - Try `decorators-legacy` as a fallback (ADR-1 alternative). This requires revising ADR-1 and ADR-2.
   - Check `@ianvs/prettier-plugin-sort-imports` GitHub issues for known compatibility issues with the installed version.
3. If switching to `decorators-legacy` resolves the issue, document the decision change in ADR-1.

**Verification**: T34 passes — `prettier.format()` completes without `SyntaxError` on a file with decorators and unsorted imports.

---

### R7: Pre-Existing Test Failures

**Risk**: The user reports "fix all currently failing tests." The research stage did not capture a test baseline [ref: [../01-research/03-open-questions.md#q3](../01-research/03-open-questions.md#q3)]. Unknown failures may be unrelated to this task (e.g., dependency version drift, snapshot staleness, fixture issues). The scope of "fix all" is unbounded.

**Probability**: Medium — shared config repos are sensitive to dependency version changes (Prettier, ESLint, typescript-eslint all release frequently). Snapshot drift is common.

**Impact**: Medium — pre-existing failures could block the task or expand its scope unpredictably. However, based on the codebase analysis, the test suite is small (32 tests) and focused, so widespread breakage is unlikely.

**Mitigation steps**:
1. **Run `vitest` before any code changes** to establish a failure baseline (per Q3 decision: "implement first, then fix" — but a baseline run is still valuable for attribution).
2. Categorize each failure:
   - **Snapshot drift** (T15, T16, T17, T18): Fix with `vitest --update` + review.
   - **Integration test failures** (T19–T26): Likely dependency or fixture issues. Debug individually.
   - **Unit test failures** (T1–T14): Likely config shape drift. Check recent dependency updates.
3. Fix pre-existing failures first if they are trivial (snapshot updates). If complex, implement the task changes first (per user's Q3 decision), then fix all remaining failures together.
4. **Scope limit**: If a pre-existing failure requires significant investigation (>1 hour equivalent), flag it to the user as a separate issue.

**Verification**: All 34 tests pass after implementation.

---

### R8: Plugin Version Compatibility

**Risk**: The project depends on `@ianvs/prettier-plugin-sort-imports: ^4.4.0`. The `importOrderParserPlugins` option with nested `["decorators", { "decoratorsBeforeExport": true }]` syntax requires the plugin to correctly pass this to Babel. Older 4.x versions might not support the nested array syntax for decorator options.

**Probability**: Low — `importOrderParserPlugins` has been supported since v3.x of the plugin [ref: [../01-research/02-external-research.md](../01-research/02-external-research.md)], and v4.4.0+ includes full Babel plugin passthrough. The nested array syntax for decorator options is a Babel convention that the plugin forwards directly.

**Impact**: High — if the installed version doesn't support the syntax, the config change silently fails (decorators not enabled) or throws a runtime error during formatting.

**Mitigation steps**:
1. T34 directly validates this — if the plugin version doesn't support the decorator option syntax, `prettier.format()` will fail on the decorator fixture.
2. If T34 fails with a plugin configuration error (not a Babel parse error):
   - Check installed version: `npm ls @ianvs/prettier-plugin-sort-imports`.
   - Check the plugin's CHANGELOG for the minimum version supporting `importOrderParserPlugins` with nested decorator options.
   - If needed, update the dependency version constraint in `package.json`.
3. Test with the exact resolved version in `node_modules`, not just the semver range.

**Verification**: T34 passes with the currently installed plugin version.
