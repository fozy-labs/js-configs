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

Analyze the `@fozy-labs/js-configs` repository to document everything relevant to setting up a CI/CD pipeline for npm publishing. Write your findings to `01-codebase-analysis.md` in the stage directory.

**Read these files:**
- `@/package.json` — full contents: scripts, exports, files, bin, dependencies, peerDependencies, engines, publishConfig (if any)
- `@/tsconfig.json` — compiler options, outDir, include/exclude
- `@/tsconfig.test.json` — test-specific TS config
- `@/vitest.config.ts` — test configuration
- `@/eslint.config.ts` — lint configuration
- `@/.gitignore` — ignored paths (especially `dist/`, `node_modules/`)

**Trace and document:**

1. **Build pipeline**: What does `npm run build` do? What is the output directory? What files end up in the published package (check `files` field in package.json)?
2. **Test pipeline**: What does `npm test` do? Are there integration tests, snapshot tests? What test config is used?
3. **Lint and format**: What do `lint`, `format:check`, and `ts-check` scripts do? Are there separate configs for test files?
4. **Package metadata**: Scope (`@fozy-labs`), version, exports map, bin entry, repository URL, license. Is there a `publishConfig` field? Is `access: public` set anywhere?
5. **Dependencies vs peerDependencies**: What's the split? Are there devDependencies? What Node.js version is expected (check `engines` field if any)?
6. **Existing CI artifacts**: Is there any `.github/` directory, `.npmrc`, `.nvmrc`, `.node-version`, or similar CI-related config files?
7. **TypeScript output**: What does the compiled output look like? Where do declaration files go?

**Constraints:**
- Only document facts. No recommendations.
- Reference files with `@/` alias (e.g., `@/package.json`).
- If a field or file doesn't exist, explicitly state that.

**Task context:** Read `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\TASK.md` for full task description.

---

## Phase 2: External Research — GitHub Actions npm Publishing

- **Agent**: `rdpi-external-researcher`
- **Output**: `02-external-research.md`
- **Depends on**: —
- **Retry limit**: 1

### Prompt

Research current best practices (2025–2026) for publishing scoped npm packages from GitHub Actions. Write your findings to `02-external-research.md` in the stage directory.

**Research areas:**

1. **npm provenance and OIDC**: How does npm provenance work with GitHub Actions? What permissions are needed? Is it mandatory or recommended for public packages? What does the `--provenance` flag do?
2. **Authentication methods**: `NPM_TOKEN` (classic automation token) vs. npm granular access tokens vs. OIDC-based publishing (no token needed). Pros/cons of each. Which is current best practice?
3. **GitHub Actions workflow triggers**: Best trigger events for npm publishing — `release` event, tag push (`v*`), manual `workflow_dispatch`, or a combination. Pros/cons.
4. **CI matrix strategy**: Should CI run on multiple Node.js versions? Which versions are current LTS (2025–2026)? Is matrix testing valuable for a config-only package?
5. **Scoped package publishing**: Any special configuration needed for `@fozy-labs/*` scoped packages? Does `publishConfig.access: "public"` need to be in package.json?
6. **Workflow structure**: Single workflow vs. separate CI and publish workflows. Reusable workflows. Job dependencies with `needs`.
7. **Security best practices**: Minimal permissions (`contents: read`, `id-token: write`), environment protection rules, concurrency control, pinning action versions with SHA.
8. **Caching**: npm caching strategies in GitHub Actions (`actions/setup-node` built-in cache vs. `actions/cache`).
9. **Version management**: Manual version bumping vs. automated (changesets, semantic-release, release-please). What's common for small utility packages?

**Skepticism directive:** Cross-reference claims across multiple sources. Annotate each finding with confidence level:
- **High** — documented in official GitHub/npm docs or widely adopted
- **Medium** — common community practice but not officially documented
- **Low** — single-source claim or rapidly changing area

Separate established practices from opinions. Cite sources where possible.

**Task context:** Read `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\TASK.md` for full task description.

---

## Phase 3: Open Questions

- **Agent**: `rdpi-questioner`
- **Output**: `03-open-questions.md`
- **Depends on**: 1, 2
- **Retry limit**: 1

### Prompt

Based on the codebase analysis and external research, identify unresolved questions, ambiguities, trade-offs, and decisions that need user input. Write your findings to `03-open-questions.md` in the stage directory.

**Context:** The task is to set up a GitHub Actions CI/CD pipeline for publishing `@fozy-labs/js-configs` (a scoped public npm package with shared ESLint/Prettier/TypeScript/Vitest configs). The pipeline should run CI checks on PRs/pushes and publish to npm on releases.

**Read these files first:**
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\TASK.md`
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\01-research\01-codebase-analysis.md`
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\01-research\02-external-research.md`

**Generate questions about:**
- **Technical constraints**: Node.js version requirements, npm token type choice, provenance setup complexity
- **Workflow triggers**: Which events should trigger CI vs. publish? Should there be a manual trigger?
- **Scope ambiguities**: Does the user want separate CI and publish workflows or a single workflow? How should version bumping work?
- **Risks**: What could go wrong with OIDC vs. token-based auth? What if provenance setup is too complex?
- **Setup instructions scope**: How detailed should the Russian-language setup guide be? Should it cover npm org creation?

**For each question include:**
- Context: why this matters
- Options: available choices (if applicable)
- Risks: what's at stake
- Recommendation: researcher's suggested default (clearly marked as suggestion, not decision)

**Priority classification:**
- **High** — blocks design decisions
- **Medium** — affects quality but has reasonable defaults
- **Low** — nice-to-know, can be deferred

---

## Phase 4: Research Review

- **Agent**: `rdpi-research-reviewer`
- **Output**: Updates `README.md`
- **Depends on**: 1, 2, 3
- **Retry limit**: 2

### Prompt

Review all research outputs and update `README.md` in the stage directory with a comprehensive summary. 

**Read these files:**
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\TASK.md`
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\01-research\01-codebase-analysis.md`
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\01-research\02-external-research.md`
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\01-research\03-open-questions.md`
- `d:\Area\projects\fz\js-configs\.thoughts\2026-03-20-1500_github-cicd-npm-publish\01-research\README.md` (current version to update)

**Update README.md with this structure** (preserve the existing frontmatter, update `status` to `Done` only if all checks pass):

1. **Summary** — 2–3 sentences: what was researched and main conclusions
2. **Documents** — list of phase output files with one-line descriptions
3. **Key Findings** — 5–7 bullet points covering the most important facts from codebase analysis and external research
4. **Contradictions and Gaps** — any conflicting information between sources or missing data
5. **Quality Review** — checklist:
   - [ ] All referenced files exist and are non-empty
   - [ ] File references use `@/` alias correctly
   - [ ] External research includes confidence levels (High/Medium/Low)
   - [ ] External research cites sources
   - [ ] Questions are actionable and prioritized
   - [ ] No solutions or recommendations appear in codebase analysis
   - [ ] Frontmatter is correct in all files
   - [ ] Cross-references between documents are consistent
6. **Next Steps** — what the design stage should focus on

**Constraints:**
- Verify every claim: if codebase analysis says a field exists in package.json, confirm it. If external research cites a practice, check specificity.
- Flag any contradictions between codebase reality and external best practices (e.g., missing `publishConfig`).
- If quality checks fail, set status to `Inprogress` and note what needs fixing.

---
