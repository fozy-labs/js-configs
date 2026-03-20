---
title: "Research: GitHub CI/CD for NPM Package Publishing"
date: 2026-03-20
status: Approved
feature: "GitHub Actions CI/CD pipeline to publish @fozy-labs/js-configs to npm"
rdpi-version: b0.4
---

## Summary

Исследование охватило три области: анализ существующей кодовой базы `@fozy-labs/js-configs` (v0.1.0), изучение актуальных (2025–2026) best practices для GitHub Actions npm publishing, и формулирование открытых вопросов, требующих решений на этапе дизайна. Пакет — scoped ESM-библиотека конфигов (ESLint, Prettier, TypeScript, Vitest) + CLI, с полностью настроенным build/test/lint pipeline, но без какой-либо CI/CD инфраструктуры.

Ключевые выводы: npm экосистема активно мигрирует на trusted publishing (OIDC) и provenance, legacy automation tokens удалены (ноябрь 2025). Для первой публикации scoped пакета trusted publishing не подходит (пакет должен существовать на npm), поэтому granular access token — практичный стартовый подход. В `package.json` отсутствует поле `engines`, что связано с выбором Node.js версии для CI. Основные решения на стадии дизайна: метод аутентификации, структура workflow, триггер публикации, и уровень security hardening.

## Documents

- [Codebase Analysis](./01-codebase-analysis.md) — полный анализ build pipeline, test setup, lint/format config, package metadata, exports map, зависимостей и отсутствующих CI артефактов.
- [External Research](./02-external-research.md) — исследование npm provenance, OIDC trusted publishing, GitHub Actions triggers, Node.js LTS schedule, scoped packages, caching, security hardening, и инструментов версионирования.
- [Open Questions](./03-open-questions.md) — 11 открытых вопросов (3 high, 5 medium, 3 low priority) с контекстом, опциями, рисками и рекомендациями исследователя.

## Key Findings

1. **CI инфраструктура полностью отсутствует** — нет `.github/workflows/`, `.npmrc`, `.nvmrc`, `.node-version`; все скрипты (build, test, lint, format, ts-check) уже готовы в `package.json` (codebase analysis, §6).
2. **Legacy npm automation tokens удалены с ноября 2025** — доступны только granular access tokens и trusted publishing (OIDC); старые CI конфигурации не работают (external research, §2).
3. **Trusted publishing требует npm CLI 11.5.1+ / Node 22.14.0+** и невозможен для первой публикации пакета — пакет должен существовать на npm для настройки trusted publisher (external research, §2 + pitfalls §5).
4. **`publishConfig.access: "public"` уже настроен** в `package.json` (`@/package.json:81-83`), что устраняет одну из частых ошибок при публикации scoped пакетов (codebase analysis, §4).
5. **Node.js 20.x выходит на EOL в апреле 2026** (через месяц); 22.x — Maintenance LTS до апреля 2027; 24.x — Active LTS; поле `engines` в package.json отсутствует (external research, §4 + codebase analysis, §5).
6. **npm provenance рекомендуется для публичных пакетов** — добавляет verification badge на npmjs.com; требует `permissions: id-token: write` и `--provenance` флаг; не работает с приватными репозиториями (external research, §1).
7. **Два устоявшихся паттерна workflow** — единый файл с `needs` (GitHub official docs) и два отдельных файла `ci.yml` + `publish.yml` (community standard для малых проектов); GitHub рекомендует триггер `release: types: [published]` (external research, §3 + §6).

## Contradictions and Gaps

1. **Публичность репозитория не подтверждена** — codebase analysis указывает `homepage: https://github.com/fozy-labs/js-configs`, что предполагает публичный репозиторий, но это не верифицировано. Это критично для provenance (не работает с приватными repos) и trusted publishing.
2. **TASK.md указывает `npm` как package manager** ("inferred from package.json"), но explicit `packageManager` field в `package.json` не упомянут в codebase analysis — неясно, настроено ли corepack.
3. **Open questions Q5 (версионирование) рекомендует "вне scope"**, но TASK.md setup guide включает "Workflow usage and triggering" — нужно описать процесс release, даже если автоматизация не входит в deliverables.
4. **Минимальная версия Node.js не определена** — нет `engines` field, и ни один документ не определил фактический минимум совместимости пакета (только рекомендации по LTS).

## Quality Review

### Checklist

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | All phases produced output files | PASS | Все три файла (01, 02, 03) присутствуют и содержательны |
| 2 | Codebase analysis has exact file:line references | PASS | Используется `@/` alias с номерами строк (e.g., `@/package.json:49`, `@/tsconfig.json:13-14`) |
| 3 | External research has source + confidence annotations | PASS | Каждый раздел содержит confidence level (High/Medium/Low) и ссылки на источники; итоговый раздел Sources перечисляет 12 URL |
| 4 | Open questions are actionable (context, options, risks) | PASS | Все 11 вопросов содержат Context, Options (с pros/cons), Risks, и Researcher recommendation |
| 5 | No solutions or design proposals in research | PASS | Codebase analysis содержит только факты; external research описывает паттерны без предписаний; open questions содержат "Researcher recommendation" в формате evidence-based leanings — допустимо |
| 6 | YAML frontmatter present on all files | PASS | Все три файла имеют корректный YAML frontmatter с title, date, stage, role, workflow |
| 7 | Cross-references consistent between documents | PASS | Findings codebase analysis (отсутствие engines, наличие publishConfig, скрипты) корректно отражены в open questions; external research findings о trusted publishing / provenance корректно использованы в open questions |

### Issues Found

No critical issues found.

1. **External research `actions/setup-node` version inconsistency** — в §6 GitHub official example используется `actions/setup-node@v4`, а в §8 caching example — `@v6`. Оба могут быть корректны (v4 — цитата из docs, v6 — актуальная версия), но это может запутать при реализации. — Severity: Low
2. **TASK.md `rdpi-version` (b0.4) vs README `rdpi-version` (b0.2)** — исходный README содержал устаревшую версию workflow; исправлено в этом обновлении. — Severity: Low (resolved)

## Next Steps

Proceeds to Design stage after human review.
