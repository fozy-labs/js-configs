---
title: "Phases: 01-research"
date: 2026-03-20
stage: 01-research
---

# Phases: 01-research

## Phase 1: Codebase Analysis

- **Agent**: `rdpi-codebase-researcher`
- **Output**: `01-codebase-analysis.md`
- **Depends on**: —
- **Retry limit**: 2

### Prompt

Analyze the js-configs repository to gather facts relevant to three objectives: adding Prettier decorator support, extending import sorting tests, and fixing failing tests.

**Entry points to investigate:**

1. **Prettier configuration** — read `@/src/prettier/index.ts` and its test at `@/src/prettier/__tests__/prettier-config.test.ts`. Document:
   - The full exported config object (all options, plugins, plugin options)
   - Whether any decorator-related options exist (e.g., `experimentalDecorators`, parser plugins)
   - Which import sorting plugin is used (if any) and its configuration (importOrder patterns, importOrderSeparation, etc.)

2. **Test suites** — read ALL test files: `@/src/__tests__/integration.test.ts`, `@/src/__tests__/snapshots.test.ts`, `@/src/__tests__/typescript-config.test.ts`, `@/src/cli/__tests__/cli.test.ts`, `@/src/eslint/__tests__/eslint-config.test.ts`, `@/src/prettier/__tests__/prettier-config.test.ts`, `@/src/vitest/__tests__/vitest-config.test.ts`. For each test file, document:
   - What test cases exist (names and assertions)
   - Whether any tests cover import sorting behavior
   - Whether any tests cover decorator formatting

3. **Fixture files** — read all files under `@/src/__tests__/fixtures/prettier-project/`. Document their content and purpose, paying attention to import ordering patterns.

4. **Snapshot files** — list and read files under `@/src/__tests__/__snapshots__/`. Document what configurations are snapshotted.

5. **Dependencies** — read `@/package.json`. Document:
   - All Prettier-related dependencies (prettier itself, plugins)
   - All test-related dependencies (vitest, etc.)
   - Version numbers for all of the above

6. **ESLint configuration** — read `@/src/eslint/index.ts`. Check if ESLint config has any decorator or import sorting rules that interact with Prettier.

7. **Vitest configuration** — read `@/vitest.config.ts`. Document test runner setup.

Write only facts. Do not propose solutions. Output to `01-codebase-analysis.md` in the stage directory at `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/`.

---

## Phase 2: External Research

- **Agent**: `rdpi-external-researcher`
- **Output**: `02-external-research.md`
- **Depends on**: —
- **Retry limit**: 1

### Prompt

Research the ecosystem around Prettier decorator support and import sorting plugins. Focus on these areas:

1. **Prettier and TC39 decorators (stage 3)** — How does Prettier handle decorators as of its latest versions? Is there a built-in parser option (e.g., `experimentalDecorators` in the TypeScript parser)? Are there any Prettier plugins specifically for decorator formatting? What Prettier version introduced stable decorator support? Document any known issues or limitations.

2. **Import sorting plugins for Prettier** — Compare the two main plugins:
   - `@trivago/prettier-plugin-sort-imports`
   - `@ianvs/prettier-plugin-sort-imports`
   Document: supported import order patterns (especially alias paths like `@/...`, external packages like `@scope/pkg`, relative paths at various depths), configuration options, known compatibility issues with other Prettier plugins, Prettier version compatibility.

3. **Decorator + import sorting interaction** — Are there known conflicts when using decorator support alongside import sorting plugins? Do any import sorting plugins have special handling for decorated imports or files with decorators?

4. **Best practices for testing Prettier configurations** — How do well-maintained projects test their shared Prettier configs? Snapshot testing vs. assertion-based testing. Fixture patterns.

Cross-reference all claims. Annotate findings with confidence levels: **High** (verified in official docs/source), **Medium** (consistent across multiple community sources), **Low** (single source or anecdotal). Separate established practices from opinions.

Output to `02-external-research.md` in the stage directory at `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/`.

---

## Phase 3: Open Questions

- **Agent**: `rdpi-questioner`
- **Output**: `03-open-questions.md`
- **Depends on**: 1, 2
- **Retry limit**: 1

### Prompt

You have two research documents to work from:

- Codebase analysis: `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/01-codebase-analysis.md`
- External research: `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/02-external-research.md`
- Original task: `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/TASK.md`

The feature involves three objectives:
1. Adding decorator support (ECMA stage 3) to the Prettier configuration
2. Extending tests for import sorting with various import path patterns (@external, @/shared, ../../../relative, ../../another, ./local)
3. Fixing all currently failing tests

Generate a prioritized list of open questions, trade-offs, and ambiguities. Categories to consider:

- **Technical constraints**: Does the current Prettier version support decorators natively or does it need a plugin/upgrade? Are there version conflicts between the import sorting plugin and decorator support?
- **Compatibility**: Will adding decorator options break existing formatting behavior? Do the import sorting patterns need to change to accommodate the new test cases?
- **Scope**: Which failing tests are related to the task's changes vs. pre-existing issues? Should import sorting test fixtures be new files or extensions of existing ones?
- **Configuration**: Should decorator support be opt-in or always-on? What parser options are needed?

Each question must include: context (why it matters), possible options (if applicable), risks, and a recommended priority (High/Medium/Low).

Output to `03-open-questions.md` in the stage directory at `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/`.

---

## Phase 4: Research Review

- **Agent**: `rdpi-research-reviewer`
- **Output**: Updates `README.md`
- **Depends on**: 1, 2, 3
- **Retry limit**: 2

### Prompt

Review all research outputs and update `README.md` in the stage directory.

Files to review:
- `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/01-codebase-analysis.md`
- `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/02-external-research.md`
- `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/03-open-questions.md`
- `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/TASK.md`

Update `README.md` at `.thoughts/2026-03-20-1200_prettier-decorators-and-tests/01-research/README.md` with:

1. **Summary** — 2–3 paragraph overview of what was found
2. **Documents** — links to all phase output files with one-line descriptions
3. **Key Findings** — 5–7 bullet points summarizing the most important facts discovered:
   - Current Prettier config state (plugins, options)
   - Decorator support status (what's needed)
   - Import sorting plugin and its current pattern configuration
   - Test coverage gaps (what's tested, what's missing)
   - Failing test root causes
   - Dependency version constraints
4. **Contradictions and Gaps** — any inconsistencies between codebase analysis and external research, or information that's still missing
5. **Quality Review** — checklist to verify:
   - [ ] All files referenced in documents actually exist
   - [ ] Version numbers match between codebase analysis and package.json
   - [ ] External research sources are attributed with confidence levels
   - [ ] Open questions are actionable (not vague)
   - [ ] No solutions proposed in research outputs (facts only)
   - [ ] Frontmatter is correct in all documents
   - [ ] Cross-references between documents are consistent
6. **Next Steps** — what the design stage should address based on findings

Preserve the existing frontmatter in README.md. Set `status: Done` if all quality checks pass, or `status: Inprogress` with notes on what needs fixing.

---
