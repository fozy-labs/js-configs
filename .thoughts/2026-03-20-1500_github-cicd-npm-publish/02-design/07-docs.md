---
title: "Documentation Impact"
date: 2026-03-20
stage: 02-design
role: rdpi-architect
workflow: b0.4
---

# Documentation Impact

## New Document: `.mentall/cicd-setup.md`

Setup guide in Russian covering the CI/CD pipeline configuration and release process [ref: TASK.md deliverable #2].

### Required Sections

1. **Prerequisites** — what must exist before setup (npm account, `@fozy-labs` org, GitHub repo access)
2. **Создание npm granular access token** — type, scope, expiration settings; link to npm docs
3. **Первая публикация** — manual `npm publish --access public` steps
4. **Настройка OIDC trusted publisher на npm** — where to configure, exact values (repo, workflow, environment); link to npm trusted publishing docs
5. **Настройка GitHub Environment `npm`** — creating the environment in repo settings; link to GitHub docs
6. **Процесс выпуска версии** — `npm version` + `git push --follow-tags` commands; expected CI/publish behavior
7. **Troubleshooting** — common errors: OIDC auth failure, version already exists, CI fails on tag push

### Style

- Language: Russian
- Format: concise step-by-step instructions + links to official docs for details
- No screenshots — text-based instructions only
- External links: npm docs (trusted publishing, access tokens), GitHub docs (environments)

### Proportionality Check

The `.mentall/` directory is gitignored [ref: [codebase analysis §6](../01-research/01-codebase-analysis.md#6-existing-ci-artifacts)], so this guide is a local maintainer reference, not published documentation. A single concise file (~50–80 lines) is appropriate — it covers project-specific setup details and links to official documentation for general concepts.

No changes needed to `README.md` or other existing documentation.
