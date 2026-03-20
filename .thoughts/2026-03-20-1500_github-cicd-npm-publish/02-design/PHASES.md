---
title: "Phases: 02-design"
date: 2026-03-20
stage: 02-design
---

# Phases: 02-design

## Phase 1: Architecture & Decisions

- **Agent**: `rdpi-architect`
- **Output**: `01-architecture.md`, `02-dataflow.md`, `04-decisions.md`, `05-usecases.md`, `07-docs.md`
- **Depends on**: —
- **Retry limit**: 2

### Prompt

Ты проектируешь архитектуру GitHub Actions CI/CD pipeline для npm-пакета `@fozy-labs/js-configs`.

**Контекст — прочитай эти файлы:**
- TASK.md: `../TASK.md`
- Research — codebase analysis: `../01-research/01-codebase-analysis.md`
- Research — external research: `../01-research/02-external-research.md`
- Research — open questions: `../01-research/03-open-questions.md`
- Research — summary: `../01-research/README.md`

**Пользовательские решения (утверждены):**
- Аутентификация: OIDC (trusted publishing), первая публикация вручную с granular token
- Структура: два отдельных файла (`ci.yml` + `publish.yml`), связанных через `workflow_run`
- Триггер публикации: `push: tags: ['v*']`
- Node.js: 22.x (одна версия, без матрицы)
- Версионирование: ручное (`npm version`)
- Provenance: включить (`--provenance`)
- Поле `engines`: добавить в `package.json`
- Безопасность: Medium (SHA pinning + dependabot)
- Setup guide: минимальный с ссылками на официальные доки
- `workflow_dispatch`: не нужен
- CI checks: ts-check + format:check + lint + test; build только в publish job

**Создай следующие файлы:**

### 01-architecture.md
Архитектура CI/CD pipeline:
- Структура файлов: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `.github/dependabot.yml`
- **CI workflow (`ci.yml`)**: триггеры (push to main, PR), jobs, steps (checkout → setup-node с cache → npm ci → ts-check → format:check → lint → test), permissions
- **Publish workflow (`publish.yml`)**: триггер (push tags `v*`), job с `environment: npm`, permissions (id-token: write, contents: read), steps (checkout → setup-node → npm ci → build → npm publish --provenance --access public), связь с CI через `workflow_run`
- Изменения в `package.json`: добавление поля `engines` (`node: ">=22.0.0"`)
- `.github/dependabot.yml`: конфигурация для `github-actions` ecosystem
- Модель разрешений: OIDC permissions, GitHub environment `npm`, минимальные permissions по принципу least privilege
- SHA pinning: все actions закреплены на SHA конкретных версий

Используй Mermaid-диаграммы:
- C4 Component diagram: репозиторий, GitHub Actions, npm registry, OIDC provider
- Диаграмма структуры jobs/steps для каждого workflow

### 02-dataflow.md
Data flow для ключевых сценариев:
- PR flow: push → CI triggers → checks run → status reported
- Merge to main flow: merge → CI triggers → checks run
- Release flow: `npm version` → `git push --follow-tags` → tag push triggers publish workflow → (опционально) `workflow_run` triggers CI → build → OIDC auth → npm publish with provenance
- First publish flow: manual `npm publish` with granular token

Используй Mermaid sequence diagrams для каждого сценария.

### 04-decisions.md
ADR для ключевых решений. Формат для каждого ADR:
- **Status**: Accepted
- **Context**: контекст из исследования (со ссылками на research docs)
- **Options**: варианты с pros/cons
- **Decision**: выбранный вариант
- **Consequences**: последствия

ADR список:
- ADR-1: OIDC trusted publishing vs granular access token
- ADR-2: Два отдельных workflow файла vs единый файл
- ADR-3: Tag push trigger vs release event trigger
- ADR-4: Node.js 22.x single version vs matrix
- ADR-5: SHA pinning для actions
- ADR-6: Ручное версионирование vs автоматическое
- ADR-7: Добавление поля `engines` в package.json

### 05-usecases.md
Минимальный файл — developer workflows (не API use cases):
- UC-1: Разработчик открывает PR → CI запускает проверки → статус отображается в PR
- UC-2: Разработчик мержит PR в main → CI запускает проверки
- UC-3: Мейнтейнер выпускает новую версию → `npm version patch/minor/major` → `git push --follow-tags` → Publish workflow публикует на npm
- UC-4: Первая публикация пакета (one-time setup)
- Для каждого UC: шаги, триггеры, ожидаемый результат, edge cases

### 07-docs.md
Структура и контент setup guide (`.mentall/cicd-setup.md`):
- Определи КАКИЕ разделы нужны в guide, НЕ пиши сам guide
- Разделы: prerequisites, настройка npm granular token, первая публикация, настройка OIDC trusted publisher на npm, настройка GitHub environment `npm`, конфигурация secrets, процесс выпуска версии, troubleshooting
- Guide пишется на русском языке
- Минимальный стиль: краткие инструкции + ссылки на официальные доки

**ВАЖНО**: файл должен быть КОРОТКИМ и сфокусированным. Описывай только КАКАЯ документация нужна и ЧТО она должна покрывать. Не пиши сам guide.

**Все дизайн-решения ДОЛЖНЫ ссылаться на research documents** через относительные ссылки (e.g., `[codebase analysis](../01-research/01-codebase-analysis.md)`).

---

## Phase 2: QA Strategy & Risks

- **Agent**: `rdpi-qa-designer`
- **Output**: `06-testcases.md`, `08-risks.md`
- **Depends on**: 1
- **Retry limit**: 1

### Prompt

Ты проектируешь стратегию QA и анализ рисков для GitHub Actions CI/CD pipeline пакета `@fozy-labs/js-configs`.

**Контекст — прочитай эти файлы:**
- TASK.md: `../TASK.md`
- Architecture: `./01-architecture.md`
- Data flow: `./02-dataflow.md`
- Decisions: `./04-decisions.md`
- Use cases: `./05-usecases.md`
- Docs design: `./07-docs.md`
- Research summary: `../01-research/README.md`

**Создай следующие файлы:**

### 06-testcases.md
Стратегия верификации CI/CD pipeline. Это НЕ юнит-тесты в коде — это план проверки того, что workflows работают корректно.

Формат таблицы test cases:
| ID | Category | Description | Input/Trigger | Expected Output | Priority |

Категории:
- **CI Workflow**: проверка что CI запускается на PR, на push to main, что все checks проходят на валидном коде
- **Publish Workflow**: проверка что publish срабатывает на tag push, что OIDC аутентификация работает, что provenance badge появляется
- **Negative Cases**: PR с failing tests блокирует merge, publish без tag не запускается, publish с неверными permissions фейлится
- **Edge Cases**: concurrent runs, tag без соответствующего коммита, first publish scenario
- **Security**: permissions не избыточны, secrets не утекают в логи

Также определи:
- Подход к тестированию: manual verification checklist vs automated (для CI/CD workflows ручная верификация — стандартная практика)
- Acceptance criteria для каждой категории

### 08-risks.md
Анализ рисков CI/CD pipeline.

Формат таблицы рисков:
| ID | Risk | Probability (H/M/L) | Impact (H/M/L) | Strategy | Mitigation |

Категории рисков:
- **Аутентификация**: OIDC misconfiguration, token expiration, npm trusted publisher setup failure
- **Публикация**: публикация broken пакета, дублирование версии, first publish failure
- **CI**: flaky tests blocking merge, cache corruption, dependency resolution failures
- **Безопасность**: supply chain attacks через compromised actions, secrets leakage, permission escalation
- **Операционные**: npm outage during publish, GitHub Actions outage, Node.js version incompatibility

Для рисков с High impact — подробные планы митигации (2-3 предложения).

---

## Phase 3: Design Review

- **Agent**: `rdpi-design-reviewer`
- **Output**: Updates `README.md`
- **Depends on**: 1, 2
- **Retry limit**: 2

### Prompt

Ты рецензируешь дизайн GitHub Actions CI/CD pipeline для `@fozy-labs/js-configs`.

**Прочитай ВСЕ дизайн-документы:**
- Architecture: `./01-architecture.md`
- Data flow: `./02-dataflow.md`
- Decisions: `./04-decisions.md`
- Use cases: `./05-usecases.md`
- Test cases: `./06-testcases.md`
- Docs design: `./07-docs.md`
- Risks: `./08-risks.md`

**Прочитай research documents (для проверки трассируемости):**
- Research summary: `../01-research/README.md`
- Codebase analysis: `../01-research/01-codebase-analysis.md`
- External research: `../01-research/02-external-research.md`
- Open questions: `../01-research/03-open-questions.md`

**Пользовательские решения (утверждены):**
- Аутентификация: OIDC (trusted publishing), первая публикация вручную с token
- Структура: два файла (`ci.yml` + `publish.yml`) через `workflow_run`
- Триггер: `push: tags: ['v*']`
- Node.js: 22.x, без матрицы
- Версионирование: ручное (`npm version`)
- Provenance: включить
- `engines`: добавить
- Безопасность: SHA pinning + dependabot
- Setup guide: минимальный
- CI checks: ts-check + format:check + lint + test; build только в publish

**Критерии проверки:**
1. **Research traceability**: каждое дизайн-решение ссылается на research findings
2. **Internal consistency**: архитектура, dataflow, decisions, use cases, test cases не противоречат друг другу
3. **Completeness**: все deliverables из TASK.md покрыты дизайном; все пользовательские решения отражены в ADR
4. **Feasibility**: дизайн реализуем в рамках GitHub Actions / npm / OIDC capabilities
5. **ADR completeness**: все ADR имеют Status, Context, Options, Decision, Consequences
6. **Mermaid conformance**: диаграммы валидны, озаглавлены, ≤15–20 элементов
7. **Test-risk coverage**: тест-кейсы покрывают идентифицированные риски; риски имеют actionable mitigations
8. **Docs proportionality**: `07-docs.md` короткий, описывает WHAT не HOW
9. **Research open questions**: все 11 вопросов из `03-open-questions.md` адресованы или явно deferred
10. **User decisions alignment**: дизайн соответствует всем пользовательским решениям из утверждения

**Обнови `README.md`** в текущей директории (`./README.md`):
- Overview: краткое описание дизайна
- Goals и Non-Goals
- Documents: ссылки на все дизайн-файлы с описаниями
- Key Decisions: краткий обзор ADR
- Quality Review: таблица-чеклист по критериям выше (# | Criterion | Status | Notes)
- Issues Found: если есть
- Next Steps

---
