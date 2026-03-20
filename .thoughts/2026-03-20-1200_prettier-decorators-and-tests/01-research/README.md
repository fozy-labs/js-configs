---
title: "Research: Prettier Decorator Support and Test Extension"
date: 2026-03-20
status: Approved
feature: "Add decorator support to Prettier config, extend import sorting tests, fix failing tests"
rdpi-version: b0.4
---

## Summary

The research stage investigated three objectives: adding ECMA stage 3 decorator support to the Prettier configuration, extending test coverage for import sorting with diverse import path patterns, and identifying/fixing currently failing tests. Three documents were produced — codebase analysis, external research, and open questions — covering the full scope of the task.

The central finding is that Prettier itself already formats decorators correctly via its `typescript` parser with no additional configuration. However, the `@ianvs/prettier-plugin-sort-imports` plugin (used for import ordering) internally uses Babel for parsing, and Babel requires an explicit `importOrderParserPlugins` entry (`"decorators"` or `"decorators-legacy"`) to handle files containing decorator syntax. Without it, the import sorting plugin will throw a `SyntaxError` on any file with decorators. This makes the actual config change small — adding `importOrderParserPlugins` — but the choice between `decorators` (TC39 stage 3) and `decorators-legacy` (TypeScript `experimentalDecorators`) is a key design decision, since the two are mutually exclusive in Babel.

Test coverage has significant gaps: import sorting is tested with only 3 imports covering 2 of the 5 configured groups, the existing assertion uses a silent-skip guard that can mask failures, and decorator formatting/parsing is not tested at all. The current test run status is unknown — no baseline test execution was performed during research, which is flagged as a blocking gap for implementation planning.

## Documents

- [Codebase Analysis](./01-codebase-analysis.md) — Maps the Prettier config, all test suites (32 cases across 6 files), fixture files, dependencies, and related ESLint/TypeScript/Vitest configurations.
- [External Research](./02-external-research.md) — Compares import sorting plugins, documents Prettier's built-in decorator support, covers the `importOrderParserPlugins` requirement, and surveys testing patterns for shared configs.
- [Open Questions](./03-open-questions.md) — 9 prioritized questions covering decorator plugin choice, test fixture strategy, assertion approaches, and tsconfig implications.

## Key Findings

1. **Prettier formats decorators natively** — no Prettier option or plugin is needed for decorator *formatting*; the `typescript` parser (auto-selected for `.ts` files) handles both legacy and TC39 stage 3 decorators out of the box. (External Research §1)
2. **The import sorting plugin requires `importOrderParserPlugins` for decorator files** — `@ianvs/prettier-plugin-sort-imports` uses Babel internally with default plugins `["typescript", "jsx"]`, which excludes decorator syntax; adding `"decorators"` or `"decorators-legacy"` is mandatory to avoid `SyntaxError` on decorated files. (External Research §2, Pitfall §1)
3. **`decorators` and `decorators-legacy` are mutually exclusive** — Babel allows only one per parse; the choice determines whether TC39 stage 3 or TypeScript `experimentalDecorators` syntax is supported. The task specifies "ECMA stage 3" and `tsconfig.base.json` does not set `experimentalDecorators`, favoring the `decorators` plugin. (Open Questions Q1)
4. **Import sorting test coverage is minimal** — T23 tests only builtin-before-third-party ordering using 3 imports; the 5-group config (`<BUILTIN_MODULES>`, `<THIRD_PARTY_MODULES>`, `^@/(.*)$`, `^\\.\\.(.*)`, `^\\./(.*)$`) with blank-line separators is not meaningfully validated. (Codebase Analysis §3, §9)
5. **T23's silent-skip guard masks failures** — the `if (fsIndex !== -1 && expressIndex !== -1)` condition means the test passes silently if either import is missing from the output, hiding potential regressions. (Codebase Analysis §3)
6. **Adding `importOrderParserPlugins` will require snapshot update** — the Prettier config snapshot (T16) captures the full config object; adding a new key changes the snapshot. The config shape test (T6) checks `importOrder.length === 9`, which is unaffected. (Codebase Analysis §2, §4)
7. **Current test failure state is unknown** — no test run was performed during research; the scope of "fix all failing tests" cannot be estimated without a baseline. (Open Questions Q3)

## Contradictions and Gaps

1. **Version number inaccuracy in codebase analysis** — The codebase analysis states `prettier: ^3.5.0 (peerDependency + devDependency)` and `eslint: ^9.20.0 (peerDependency + devDependency)`, conflating the two dependency categories. Actual values in `package.json`: `prettier` peerDependency is `^3.0.0` (devDependency `^3.5.0`); `eslint` peerDependency is `^9.0.0` (devDependency `^9.20.0`). The vitest peerDependency is correctly stated as `^4.0.0`.
2. **Missing test baseline** — Neither the codebase analysis nor the open questions include actual test run output. Q3 identifies this as a blocking gap but the research stage did not resolve it. The design stage will need a test run before implementation planning.
3. **External research "Solution" labels** — The Pitfalls section in external research uses "Solution" sub-headers that document known ecosystem remedies. While these are factual (not project-specific proposals), the labeling is slightly misleading for a facts-only research document. Severity: Low.

## Quality Review

### Checklist

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | All phases produced output files | PASS | 01-codebase-analysis.md, 02-external-research.md, 03-open-questions.md all present per PHASES.md |
| 2 | Codebase analysis has exact file:line references | PASS | Uses `@/src/prettier/index.ts:1-19` format throughout; verified against source files |
| 3 | External research has source + confidence annotations | PASS | Every section annotated with Sources and Confidence (High/Medium/Low) |
| 4 | Open questions are actionable (context, options, risks) | PASS | All 9 questions have Context, Options, Risks, and Researcher recommendation |
| 5 | No solutions or design proposals in research | PASS | Codebase analysis is facts-only; external research documents ecosystem practices; open questions contain evidence-based leanings in "Researcher recommendation" fields (acceptable) |
| 6 | YAML frontmatter present on all files | PASS | All three output files have correct YAML frontmatter with title, date, stage, role, workflow |
| 7 | Cross-references consistent between documents | FAIL | Codebase analysis reports incorrect peerDependency versions for prettier (`^3.5.0` vs actual `^3.0.0`) and eslint (`^9.20.0` vs actual `^9.0.0`) — see Contradictions §1 |

### Issues Found

1. **Incorrect peerDependency versions in codebase analysis** — Section 14 (Dependencies) states `prettier: ^3.5.0 (peerDependency + devDependency)` but `package.json` line 61 shows peerDependency as `^3.0.0`. Similarly, `eslint: ^9.20.0 (peerDependency + devDependency)` but actual peerDependency is `^9.0.0`. Expected: separate version entries for peerDependencies vs devDependencies. **Severity: Low** — does not affect design decisions since the relevant constraint is the devDependency version (used for testing).

2. **No test baseline captured** — The codebase analysis was instructed to "identify failing tests" but no test execution output is included. The open questions identify this as a blocking gap (Q3) but the research stage did not resolve it. Expected: at minimum, a note in the codebase analysis documenting whether tests were run and what failures were observed. **Severity: Medium** — the design stage needs this information to scope the implementation.

3. **External research uses "Solution" sub-headers in Pitfalls** — Pitfalls §1 and §2 include "Solution" labels that present known remedies from plugin documentation. While these are factual (not project-specific proposals), the label suggests prescriptive content. Expected: neutral label like "Known remedy" or "Documented fix." **Severity: Low** — content is accurate, only the label is slightly misleading.

## Next Steps

Proceeds to Design stage after human review. The design stage should address:

- Run tests to establish a failure baseline (blocking — required before implementation planning)
- Decide between `decorators` (TC39 stage 3) and `decorators-legacy` for `importOrderParserPlugins` (Q1)
- Define the import sorting test fixture strategy — new file vs extending existing (Q4)
- Choose assertion approach for comprehensive import sorting tests (Q5)
- Plan snapshot update workflow for T16 after config changes
- Determine whether the T23 silent-skip guard should be fixed as part of this task or separately

After research, proceed to `02-design` to define the solution approach for decorator support, test extensions, and test fixes.
