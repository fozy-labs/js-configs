---
title: "Phases: 02-design"
date: 2026-03-20
stage: 02-design
rdpi-version: b0.4
---

# Phases: 02-design

## Phase 1: Architecture, Decisions, and Use Cases

- **Agent**: `rdpi-architect`
- **Output**: `01-architecture.md`, `04-decisions.md`, `05-usecases.md`
- **Depends on**: —
- **Retry limit**: 2

### Prompt

You are designing the solution for adding decorator support to a shared Prettier configuration package and extending its test coverage. This is a simple feature (< 3 components affected), so architecture, decisions, and use cases are combined into one phase.

**Read these files first:**
- Task description: `../TASK.md`
- Research summary: `../01-research/README.md`
- Codebase analysis: `../01-research/01-codebase-analysis.md`
- External research: `../01-research/02-external-research.md`
- Open questions (with user decisions): `../01-research/03-open-questions.md`
- Current Prettier config source: `@/src/prettier/index.ts`
- Current import sorting fixture: `@/src/__tests__/fixtures/prettier-project/unsorted-imports.ts`
- Current integration test: `@/src/__tests__/integration.test.ts`
- Current snapshot test: `@/src/__tests__/snapshots.test.ts`
- Current prettier unit test: `@/src/prettier/__tests__/prettier-config.test.ts`

**Produce three files:**

### `01-architecture.md`

Describe the architecture of the changes. This is a minimal-impact change — keep the architecture doc proportional. Include:

1. **Component diagram** (Mermaid C4 Level 3): Show the Prettier config module (`src/prettier/index.ts`), the import sorting plugin, test files, and fixture files. Show which files change and how they relate.
2. **Change inventory**: List every file that will be created or modified, with a one-line description of what changes.
3. **Module boundaries**: The Prettier config is the only production code changing. All other changes are test-only.
4. **Data flow**: How Prettier + the import sorting plugin process a file with decorators and unsorted imports — show how `importOrderParserPlugins` affects the parsing pipeline. Use a sequence diagram.

Skip `02-dataflow.md` and `03-model.md` — they are not applicable to this task (no complex data flows or domain models).

### `04-decisions.md`

Write ADR (Architecture Decision Record) entries for these decisions. Use the format: Status, Context, Options (with pros/cons), Decision, Consequences. Each decision must cite research findings via relative links.

Required ADRs:
- **ADR-1**: Choice of `decorators` vs `decorators-legacy` for `importOrderParserPlugins`. Decision: `decorators` (TC39 stage 3) per user decision on Q1. Must cite external research §2 and open questions Q1.
- **ADR-2**: `decoratorsBeforeExport` option value. Decision: `true` per researcher recommendation on Q9. Must cite open questions Q9.
- **ADR-3**: Whether to include `"jsx"` in `importOrderParserPlugins` alongside `"typescript"` and `"decorators"`. The default is `["typescript", "jsx"]` — decide whether to keep `"jsx"` when explicitly setting the option. Consider: the project exports `.ts` configs, no `.jsx`/`.tsx` fixtures exist, but consumers may use JSX.
- **ADR-4**: Import sorting test fixture strategy — new file vs extend existing vs replace. Reference open questions Q4. Consider: T23's silent-skip guard, need for comprehensive coverage, fixture file management.
- **ADR-5**: Import sorting assertion approach — line-by-line, snapshot, group-order, or combination. Reference open questions Q5.
- **ADR-6**: Decorator test strategy — what to test (formatting only, import sorting with decorators, or both). Reference open questions Q7.
- **ADR-7**: `@ts-ignore` vs `@ts-expect-error` vs exclusion for test fixtures. Reference open questions Q8.
- **ADR-8**: Whether to fix T23's silent-skip guard as part of this task. The existing `if (fsIndex !== -1 && expressIndex !== -1)` guard silently skips the assertion if imports are missing from output.

### `05-usecases.md`

Document use cases with TypeScript code examples. Keep this minimal — no external API changes. Include:

1. **Config usage with decorators**: Show a TypeScript file with decorators and unsorted imports, and the expected formatted output after running Prettier with the updated config.
2. **Import sorting with all 5 groups**: Show a fixture file with imports from all 5 configured groups (builtin, third-party, `@/` alias, `../` relative, `./` local) in wrong order, and the expected sorted output with blank-line separators.
3. **Edge cases**: Files with only decorators (no unsorted imports), files with only imports (no decorators), files with side-effect imports mixed in, empty import groups.

Skip `07-docs.md` — no external API changes requiring documentation updates.

**Constraints:**
- All design choices must reference research documents via relative links (`../01-research/...`).
- Use Mermaid diagrams where specified (C4 component, sequence diagram).
- ADR format: Status, Context, Options (with pros/cons), Decision, Consequences.
- Keep all files proportional to the task's simplicity — avoid over-engineering the design.

---

## Phase 2: Test Strategy and Risk Analysis

- **Agent**: `rdpi-qa-designer`
- **Output**: `06-testcases.md`, `08-risks.md`
- **Depends on**: 1
- **Retry limit**: 1

### Prompt

You are designing the test strategy and risk analysis for adding decorator support to a shared Prettier configuration and extending import sorting tests.

**Read these files first:**
- Task description: `../TASK.md`
- Research summary: `../01-research/README.md`
- Codebase analysis: `../01-research/01-codebase-analysis.md` (especially §2, §3, §4, §9 for existing test inventory)
- Open questions (with user decisions): `../01-research/03-open-questions.md`
- Architecture from phase 1: `./01-architecture.md`
- Decisions from phase 1: `./04-decisions.md`
- Use cases from phase 1: `./05-usecases.md`
- Current integration test: `@/src/__tests__/integration.test.ts`
- Current prettier unit test: `@/src/prettier/__tests__/prettier-config.test.ts`
- Current snapshot test file: `@/src/__tests__/snapshots.test.ts`
- Current Vitest runner config: `@/vitest.config.ts`

**Produce two files:**

### `06-testcases.md`

Design the complete test case table for this feature. Use the format:

| ID | Category | Description | Input | Expected Output | Priority |

Categories:
- **Unit**: Prettier config shape tests (existing T6 modifications + new assertions)
- **Integration**: Import sorting tests with all 5 groups, decorator file tests, import sorting + decorators combined
- **Snapshot**: Updated snapshot for T16 after config change

For each test case, specify:
- Whether it's a new test or modification of an existing test (reference T-numbers from codebase analysis)
- The fixture file it uses (existing or new)
- The assertion approach (per ADR-5 from decisions)
- Priority: P1 (must have), P2 (should have), P3 (nice to have)

Cover these scenarios specifically:
1. Config now includes `importOrderParserPlugins` key with correct value
2. Import sorting works across all 5 groups with correct blank-line separators
3. Import sorting works in files containing decorators
4. Decorator formatting is preserved after import sorting
5. Snapshot test updated for new config shape
6. T23 silent-skip guard fix (if ADR-8 decided to fix it)
7. Edge cases: side-effect imports, empty groups, type-only imports

### `08-risks.md`

Risk analysis table:

| ID | Risk | Probability (H/M/L) | Impact (H/M/L) | Strategy | Mitigation |

Consider these risks:
1. **Snapshot breakage**: Adding `importOrderParserPlugins` changes T16 snapshot
2. **T6 config shape test**: May need updating if the test checks specific key count
3. **T23 silent-skip regression**: If the guard fix introduces its own issues
4. **Consumer compatibility**: Consumers using `decorators-legacy` syntax getting parse errors from the import sorting plugin
5. **Babel parser plugin interaction**: `decorators` + `typescript` plugin compatibility
6. **Test fixture `@ts-ignore` interference**: Comments potentially affecting import sorting behavior
7. **Pre-existing test failures**: Unknown scope of "fix all failing tests"
8. **Plugin version compatibility**: `@ianvs/prettier-plugin-sort-imports ^4.4.0` support for `importOrderParserPlugins` with `decorators` option

For high-impact risks, provide detailed mitigation plans.

**Constraints:**
- Reference architecture and decisions from phase 1 outputs.
- Test case IDs should follow the existing T-numbering scheme (T33+, since T32 is the last existing test).
- Keep proportional to the task — this is a config change + test extension, not a full system rewrite.

---

## Phase 3: Design Review

- **Agent**: `rdpi-design-reviewer`
- **Output**: Updates `README.md`
- **Depends on**: 1, 2
- **Retry limit**: 2

### Prompt

You are reviewing all design documents for the Prettier decorator support and test extension feature.

**Read ALL of these files:**
- Task description: `../TASK.md`
- Research documents:
  - `../01-research/README.md`
  - `../01-research/01-codebase-analysis.md`
  - `../01-research/02-external-research.md`
  - `../01-research/03-open-questions.md`
- Design documents (this stage):
  - `./01-architecture.md`
  - `./04-decisions.md`
  - `./05-usecases.md`
  - `./06-testcases.md`
  - `./08-risks.md`

**Review criteria:**

1. **Research traceability**: Every design decision must trace back to a specific finding in `01-research/`. Check that ADRs in `04-decisions.md` cite research documents.
2. **Internal consistency**: Decisions in `04-decisions.md` must be reflected in `01-architecture.md` (change inventory), `05-usecases.md` (code examples), and `06-testcases.md` (test cases). No contradictions between documents.
3. **Completeness**: All three task objectives are addressed — decorator support config change, test extensions, test fixes.
4. **Feasibility**: The proposed changes are implementable within the existing codebase structure. No changes require new dependencies or major refactoring.
5. **ADR completeness**: Each ADR has Status, Context, Options (with pros/cons), Decision, Consequences. No missing sections.
6. **Mermaid conformance**: Diagrams have titles, ≤ 15-20 elements, clear node names.
7. **Test-risk coverage**: Every risk in `08-risks.md` has a corresponding test case or mitigation in `06-testcases.md`, and vice versa.
8. **Docs proportionality**: Design documents are proportional to the task's simplicity. No over-engineering.
9. **No implementation code**: Design documents describe WHAT, not HOW. No actual TypeScript implementations.
10. **Research open questions addressed**: All open questions from `../01-research/03-open-questions.md` that were delegated to design (`Q4`, `Q5`, `Q7`, `Q8`, `Q9`) are resolved in `04-decisions.md`.

**Write/update `README.md`** with:
- Overview (1-2 sentences)
- Goals and Non-Goals
- Document links (to all design files produced)
- Key Decisions summary (one-line per ADR from `04-decisions.md`)
- Quality Review checklist table (the 10 criteria above, with PASS/FAIL status and notes)
- Issues Found section (if any failures)
- Next Steps

Set `README.md` status to `Draft` if all criteria pass, or `Inprogress` if issues are found that need fixing.

---
