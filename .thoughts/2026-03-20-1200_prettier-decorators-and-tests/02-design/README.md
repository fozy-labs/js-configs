---
title: "Design: Prettier Decorator Support and Test Extension"
date: 2026-03-20
status: Approved
feature: "Add decorator support to Prettier config, extend import sorting tests, fix failing tests"
research: "../01-research/README.md"
rdpi-version: b0.4
---

## Overview

Design for adding `importOrderParserPlugins` with TC39 stage 3 decorator support to the shared Prettier config, extending import sorting test coverage to all 5 configured import groups, and fixing the T23 silent-skip guard. The production change is a single config key addition; all remaining work is test-only.

## Goals

- Enable the `@ianvs/prettier-plugin-sort-imports` plugin to parse files containing TC39 stage 3 decorators without `SyntaxError`
- Validate all 5 import group patterns (`<BUILTIN_MODULES>`, `<THIRD_PARTY_MODULES>`, `^@/(.*)$`, `^\\.\\.(.*)`, `^\\./(.*)$`) with blank-line separators via integration tests
- Fix the T23 silent-skip guard that can mask import sorting failures
- Update snapshot and unit tests to reflect the new config key

## Non-Goals

- Changing `tsconfig.base.json` (TC39 stage 3 decorators work in TS 5.0+ without flags)
- Supporting `experimentalDecorators` (legacy) — consumers must override if needed
- Adding ESLint or Vitest config changes
- External documentation or API changes (no `07-docs.md`)

## Documents

- [Architecture](./01-architecture.md) — Component diagram, change inventory, module boundaries, sequence diagram of the Prettier + import sorting pipeline with decorator support
- [Decisions](./04-decisions.md) — 8 ADRs covering decorator plugin choice, fixture strategy, assertion approach, test scope, and T23 guard fix
- [Use Cases](./05-usecases.md) — 2 primary use cases (decorator+imports, all 5 groups) and 4 edge cases (no imports, no decorators, side-effect imports, empty groups)
- [Test Cases](./06-testcases.md) — 5 test cases: T6 mod, T16 mod, T23 mod, T33 new, T34 new
- [Risks](./08-risks.md) — 8 risks with detailed mitigations for high-impact items (Babel plugin interaction, plugin version compatibility)

## Key Decisions

- **ADR-1**: Use `decorators` (TC39 stage 3) for `importOrderParserPlugins`, not `decorators-legacy` — aligns with task spec and `tsconfig.base.json`
- **ADR-3**: Include `"jsx"` in `importOrderParserPlugins` to preserve parity with the plugin's default and avoid breaking JSX/TSX consumers
- **ADR-4**: Create a new fixture file (`all-groups-imports.ts`) rather than extending the existing `unsorted-imports.ts` — isolates new coverage from T23
- **ADR-5**: Use group-order assertion (extract → classify → assert order) instead of snapshots or line-by-line matching — resilient to minor Prettier version changes
- **ADR-8**: Fix T23's silent-skip guard as part of this task — replace conditional with unconditional assertions

## Quality Review

### Checklist

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Design decisions trace to research findings | PASS | All 8 ADRs cite specific research documents via `[ref: ...]` links to `01-research/` files |
| 2 | ADRs have Status, Context, Options, Decision, Consequences | PASS | All 8 ADRs contain all required sections with pros/cons in Options |
| 3 | Mermaid diagrams present and conformant | PASS | C4 component diagram (~16 elements, titled) and sequence diagram (~15 interactions, titled) in `01-architecture.md` |
| 4 | Test strategy covers identified risks | PASS | R1→T16, R2→T6, R3→T23 mod, R5→T34, R8→T34; all high-impact risks (R5, R8) have test-based verification |
| 5 | docs.md is concise and proportional to existing docs/demos | N/A | `07-docs.md` correctly omitted per PHASES.md — no external API changes; existing `docs/` contains only CHANGELOG.md, no `apps/demos/` directory |
| 6 | docs.md describes WHAT not HOW | N/A | `07-docs.md` not produced per scaling rules |
| 7 | No implementation details or code | PASS | All TS snippets are illustrative (use case input/output examples, ADR-8 assertion shape); no actual implementation code |
| 8 | Research open questions addressed or deferred | PASS | Q4→ADR-4, Q5→ADR-5, Q7→ADR-6, Q8→ADR-7, Q9→ADR-2 — all 5 design-delegated questions resolved |
| 9 | Risk analysis has actionable mitigations for high-impact risks | PASS | R5 (High): Babel conflict → fallback plan with `decorators-legacy`; R8 (High): plugin version → version check + CHANGELOG review + update path |
| 10 | Internal consistency (arch/dataflow/model/usecases) | PASS | Config value, fixture names, test IDs, assertion approaches, and change inventory are consistent across all 5 documents with no contradictions |

### Documentation Proportionality

The design documents are proportional to the task scope. The production change is a single config key addition in one file. The design correctly focuses on test strategy (the bulk of the work) with 8 concise ADRs, 5 test cases, and 8 risks. Documents `02-dataflow.md`, `03-model.md`, and `07-docs.md` were correctly omitted per scaling rules. No over-engineering detected — each ADR addresses a distinct decision that emerged from research open questions, and test specifications are detailed enough for implementation without excess.

### Issues Found

No issues found.

## Next Steps

Proceeds to Plan stage after human review.

After design approval, proceed to `03-plan` to decompose into implementation phases.
