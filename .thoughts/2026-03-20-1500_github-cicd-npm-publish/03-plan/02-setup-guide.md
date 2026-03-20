---
title: "Phase 2: Setup Guide"
date: 2026-03-20
stage: 03-plan
role: rdpi-planner
workflow: b0.4
---

## Goal

Create the `.mentall/cicd-setup.md` setup guide in Russian — a local (gitignored) maintainer reference covering first publish, OIDC configuration, release process, and troubleshooting.

## Dependencies

- **Requires**: Phase 1 (workflow filenames and structure must be finalized)
- **Blocks**: None

## Execution

Sequential — after Phase 1 is complete.

## Tasks

### Task 2.1: Create Setup Guide

- **File**: `.mentall/cicd-setup.md`
- **Action**: Create
- **Description**: Write the CI/CD setup guide in Russian with 7 sections per the documentation design. The file is gitignored (`.mentall` is in `.gitignore`), serving as a local maintainer reference.
- **Details** [ref: ../02-design/07-docs.md]:
  - Language: Russian
  - Format: concise step-by-step instructions + links to official docs
  - Target size: ~50–80 lines
  - No screenshots — text-based instructions only
  - Required sections (7):
    1. **Prerequisites** — npm account, `@fozy-labs` org on npm, GitHub repo access
    2. **Создание npm granular access token** — type (granular), scope (`@fozy-labs`), read-write, short expiration; link to npm docs for access tokens
    3. **Первая публикация** — `npm ci && npm run build && npm publish --access public` steps with the granular token; note that `--provenance` is not used for first publish [ref: ../02-design/02-dataflow.md §4]
    4. **Настройка OIDC trusted publisher на npm** — npmjs.com → Package Settings → Trusted Publishers; exact values: repo `fozy-labs/js-configs`, workflow `publish.yml`, environment `npm`; link to npm trusted publishing docs [ref: ../02-design/01-architecture.md §7]
    5. **Настройка GitHub Environment `npm`** — GitHub → Settings → Environments → New → `npm`; link to GitHub docs [ref: ../02-design/05-usecases.md UC-4]
    6. **Процесс выпуска версии** — `npm version patch/minor/major` → `git push --follow-tags`; describe expected CI → publish chain behavior [ref: ../02-design/05-usecases.md UC-3]
    7. **Troubleshooting** — common errors: OIDC auth failure (check trusted publisher config match), version already exists (bump to new version), CI fails on tag push (fix, delete tag, re-release), forgetting `--follow-tags` [ref: ../02-design/08-risks.md R01, R04, R03, R12]

## Verification

- [ ] `npm run ts-check` passes (markdown file does not affect compilation)
- [ ] `.mentall/cicd-setup.md` exists and contains all 7 sections
- [ ] Guide is written in Russian
- [ ] Guide contains links to official npm and GitHub documentation
- [ ] Trusted publisher values match those in `publish.yml` (workflow name `publish.yml`, environment `npm`)
- [ ] File is gitignored (`.mentall` entry in `.gitignore` confirmed)
