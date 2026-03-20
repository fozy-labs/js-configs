---
title: "Design: GitHub CI/CD for NPM Package Publishing"
date: 2026-03-20
status: Approved
feature: "GitHub Actions CI/CD pipeline to publish @fozy-labs/js-configs to npm"
research: "../01-research/README.md"
rdpi-version: b0.4
---

## Overview

Design of a GitHub Actions CI/CD pipeline for `@fozy-labs/js-configs`: two workflows (`ci.yml` for checks, `publish.yml` for npm publishing via OIDC trusted publishing), connected through `workflow_run`. Includes Dependabot configuration for SHA-pinned action updates, `engines` field addition to `package.json`, and a local setup guide. All decisions trace to [research findings](../01-research/README.md) and approved user decisions.

## Goals

- Automate CI checks (ts-check, format:check, lint, test) on PRs and pushes to main
- Automate npm publishing with provenance on tag push (`v*`) after CI passes
- Use OIDC trusted publishing (zero persistent secrets) for all CI-based publishes
- Provide a one-time setup guide for first manual publish and OIDC configuration
- Apply medium-level security hardening: SHA pinning + Dependabot

## Non-Goals

- Automated versioning (release-please, semantic-release, changesets) — manual `npm version` only
- Multi-version Node.js matrix — single 22.x version
- `workflow_dispatch` manual trigger for publish
- Environment protection rules (approval gates) — can be added later
- CODEOWNERS, tag protection, concurrency control — beyond current security scope
- GitHub Releases integration (release notes, draft releases)

## Documents

- [Architecture](./01-architecture.md) — CI and Publish workflow structure, triggers, steps, permissions, OIDC model, SHA pinning, Dependabot config, `package.json` changes
- [Data Flow](./02-dataflow.md) — Sequence diagrams for PR flow, merge-to-main, release flow, first publish, and parallel push scenario
- [Decisions](./04-decisions.md) — 7 ADRs: OIDC auth, two-file structure, tag trigger, Node 22.x, SHA pinning, manual versioning, engines field
- [Use Cases](./05-usecases.md) — 4 developer workflows: PR CI, post-merge validation, release new version, first publish setup
- [Test Cases](./06-testcases.md) — 30 test cases across CI, Publish, Negative, Edge, Security categories + manual verification approach
- [Documentation Impact](./07-docs.md) — Scope of `.mentall/cicd-setup.md` setup guide (7 sections, Russian, minimal + links)
- [Risk Analysis](./08-risks.md) — 18 risks with probability/impact matrix and detailed mitigations for all high-impact risks

## Key Decisions

- **ADR-1**: OIDC trusted publishing for all CI publishes; first publish manually with temporary granular token — eliminates persistent secrets
- **ADR-2**: Two separate workflows (`ci.yml` + `publish.yml`) connected via `workflow_run` — clean separation of concerns with CI gating publish
- **ADR-3**: Tag push (`v*`) as effective trigger via CI → workflow_run chain — single-step release with `npm version` + `git push --follow-tags`
- **ADR-4**: Node.js 22.x single version, no matrix — sufficient for config-only package; satisfies trusted publishing requirement (npm CLI 11.5.1+)
- **ADR-5**: SHA pinning for all actions + Dependabot weekly updates — immutable action references with automated maintenance

## Quality Review

### Checklist

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Design decisions trace to research findings | PASS | All documents use `[ref: ...]` links to codebase analysis, external research, and open questions. ADRs cite specific research sections. Architecture references 6+ research sections per component. |
| 2 | ADRs have Status, Context, Options, Decision, Consequences | PASS | All 7 ADRs (ADR-1 through ADR-7) have complete structure. Each Options section includes pros/cons. Consequences split into Positive/Negative/Risks. |
| 3 | Mermaid diagrams present and conformant | PASS | 9 diagrams total: 4 in architecture (C4 context, CI steps, publish steps, full interaction), 5 in dataflow (PR, merge, release, first-publish, parallel-push). All titled via section headers or subgraph labels. Largest diagram ~20 elements (architecture §8). |
| 4 | Test strategy covers identified risks | PASS | All 18 risks mapped to test cases or acceptance strategy. High-impact risks (R01, R02, R03, R05, R06, R10, R11, R15, R16, R17) each reference specific test IDs. Risks with Accept strategy (R04, R07–R09, R12–R14, R18) justify why no test is needed. |
| 5 | docs.md concise and proportional to existing docs/demos | PASS | Existing `docs/` contains only `CHANGELOG.md` (~50 lines). No `apps/demos/`. Proposed: single `.mentall/cicd-setup.md` (~50–80 lines), gitignored local reference. No changes to published documentation. Proportional. |
| 6 | docs.md describes WHAT not HOW | PASS | Lists 7 required sections with one-line descriptions. Style section defines language and format. No JSDoc, no full-text drafts, no command snippets in the doc plan itself. |
| 7 | No implementation details or code | PASS | Architecture contains illustrative YAML snippets for triggers, permissions, and config shapes — appropriate for CI/CD design where YAML IS the architecture. No complete workflow files or runnable code. Actual SHA values deferred to implementation. |
| 8 | Research open questions addressed or deferred | PASS | All 11 questions resolved: Q1→ADR-1, Q2→ADR-2, Q3→ADR-3, Q4→ADR-4, Q5→ADR-6, Q6→Architecture §4 (provenance), Q7→ADR-7, Q8→ADR-5 + Architecture §7, Q9→07-docs.md (minimal+links), Q10→excluded per user decision (no workflow_dispatch), Q11→Architecture §3 Design note (ts-check in CI, build in publish). |
| 9 | Risk analysis has actionable mitigations for high-impact risks | PASS | 10 high-impact risks identified. Each has a detailed mitigation plan (2–3 steps) in the "Detailed Mitigation Plans" section, plus cross-references to test cases and use cases for verification. |
| 10 | Internal consistency (arch/dataflow/model/usecases) | PASS | Triggers, step sequences, permissions, OIDC flow, workflow_run context handling, and first-publish procedure are consistent across all 7 documents. No contradictions found. See synthesis details below. |

### Documentation Proportionality

The existing documentation footprint is minimal: `docs/CHANGELOG.md` only. No `apps/demos/` directory exists. The design proposes a single `.mentall/cicd-setup.md` file (~50–80 lines) that is gitignored — a local maintainer reference, not published documentation. No changes to `README.md`, `CHANGELOG.md`, or any existing files beyond `package.json` (one `engines` field addition). This is proportional to the feature scope: CI/CD infrastructure needs a setup guide, but the guide stays local and concise.

### Synthesis

**Traceability**: Every ADR cites specific research sections. Architecture references codebase analysis (build pipeline, test setup, scripts, package metadata, dependencies, CI artifacts) and external research (OIDC, triggers, security, caching). Dataflow traces to external research for OIDC flow and pitfalls. Risk mitigations reference both design documents and research findings.

**Internal consistency**: Verified across all documents:
- Trigger chain (tag push → CI `push: tags` → `workflow_run` → publish) is described identically in architecture (§§3–4), dataflow (§3), ADR-2, ADR-3, UC-3, test cases (T03, T07, T17, T18, T21)
- CI steps (checkout → setup-node → npm ci → ts-check → format:check → lint → test) match in architecture (§3), dataflow (§§1–3), UC-1/UC-2, T06
- Publish steps (checkout at head_sha → setup-node with registry-url → npm ci → build → npm publish --provenance) match in architecture (§4), dataflow (§3), UC-3, T08/T11
- Permissions (CI: contents read; Publish: contents read + id-token write) consistent in architecture (§7), T25/T26, R17
- `workflow_run` context handling (head_sha for checkout, head_branch for tag detection) consistent in architecture (§4), dataflow (§5), T08, R11
- First publish procedure consistent in architecture (§7), dataflow (§4), UC-4, R02

**Completeness**: All deliverables from TASK.md are covered — `ci.yml` (architecture §3), `publish.yml` (architecture §4), `dependabot.yml` (architecture §6), `package.json` changes (architecture §5), setup guide (07-docs.md). All 10 user decisions are reflected in the design.

**Feasibility**: The design uses only standard GitHub Actions capabilities (workflow_run, OIDC, environment, permissions), standard npm features (trusted publishing, provenance, granular tokens), and well-documented patterns. All referenced actions (`actions/checkout`, `actions/setup-node`) are maintained by GitHub. The `workflow_run` context nuance (head_sha/head_branch) is well-documented and the design explicitly addresses it.

### Issues Found

No critical or high-severity issues found.

1. **Low-priority user decisions (Q9, Q10, Q11) not recorded in open questions file** — The `03-open-questions.md` "User Answers" section only records Q1–Q8 answers. Q9 (minimal setup guide), Q10 (no workflow_dispatch), Q11 (ts-check in CI, build in publish) decisions were communicated separately and are correctly reflected in the design, but not formally recorded in the research stage. — Severity: **Low** — no impact on design quality; research stage is already Approved.

## Next Steps

Proceeds to Plan stage after human review.
