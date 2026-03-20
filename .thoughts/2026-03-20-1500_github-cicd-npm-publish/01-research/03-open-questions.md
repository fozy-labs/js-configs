---
title: "Open Questions: GitHub CI/CD for NPM Publishing"
date: 2026-03-20
stage: 01-research
role: rdpi-questioner
workflow: b0.4
---

## High Priority

### Q1: Authentication method — Trusted Publishing (OIDC) vs. Granular Access Token?

**Context**: npm предлагает два актуальных метода аутентификации для публикации из CI. External research выявил, что trusted publishing (OIDC) — рекомендуемый npm подход, но он требует npm CLI 11.5.1+ и Node.js 22.14.0+. Granular access token работает с любой версией Node.js, но требует хранения секрета и ручной ротации. Legacy automation tokens удалены с ноября 2025.

**Options**:
1. **Trusted Publishing (OIDC)** — Pros: нет секретов для управления; короткоживущие токены; автоматический provenance; максимальная безопасность / Cons: требует Node 22.14.0+; пакет должен быть предварительно настроен на npmjs.com; первая публикация невозможна через OIDC (пакет ещё не существует); работает только на GitHub-hosted runners
2. **Granular Access Token** — Pros: работает с любой версией Node; гибкие ограничения (scope, IP, expiry); универсальная совместимость / Cons: нужно хранить как секрет; ручная ротация; риск утечки

**Risks**: Выбор trusted publishing привязывает publish workflow к Node 22.14.0+ и исключает возможность первой публикации из CI. Выбор granular token создаёт постоянный секрет, который нужно ротировать.

**Researcher recommendation**: Granular access token — более практичный выбор для проекта на начальной стадии (v0.1.0, первая публикация). Trusted publishing можно добавить позже, когда пакет уже зарегистрирован на npm. Однако, если пользователь готов выполнить первую публикацию вручную (`npm publish --access public`), то можно сразу настроить OIDC для последующих публикаций.

---

### Q2: Workflow structure — один файл или два отдельных?

**Context**: Codebase analysis показал отсутствие любых CI артефактов. External research описывает два устоявшихся подхода: единый workflow с jobs `ci` + `publish` (через `needs`), и два отдельных файла `ci.yml` + `publish.yml`. GitHub official docs показывают единый файл.

**Options**:
1. **Один workflow** (`ci-publish.yml`) — Pros: publish гарантированно зависит от CI через `needs`; один файл для поддержки; атомарная конфигурация / Cons: файл будет расти; CI запускается и на PR, и на release (нужны условия `if`)
2. **Два workflow** (`ci.yml` + `publish.yml`) — Pros: чёткое разделение ответственности; CI на PR не содержит publish-логику; проще читать / Cons: publish не зависит напрямую от CI результатов (если не использовать `workflow_run`); дублирование шагов checkout/setup/install
3. **Два workflow с `workflow_run`** — Pros: publish зависит от CI; разделение файлов / Cons: сложнее в настройке; проблемы с trusted publishing (проверяется имя вызывающего workflow)

**Risks**: Единый файл может стать запутанным с разными триггерами и условиями. Раздельные файлы без `workflow_run` позволяют опубликовать пакет при падающих тестах, если CI workflow не завершился.

**Researcher recommendation**: Два отдельных файла (`ci.yml` + `publish.yml`) — наиболее распространённый паттерн для малых проектов. Publish на event `release: published` подразумевает, что разработчик уже убедился в прохождении CI на main-ветке перед созданием релиза.

---

### Q3: Publish trigger — `release` event, tag push или комбинация?

**Context**: External research выявил два основных триггера. GitHub official docs рекомендуют `release: types: [published]`, а npm trusted publishing примеры используют `push: tags: ['v*']`. Выбор влияет на workflow версионирования.

**Options**:
1. **`release: types: [published]`** — Pros: интеграция с GitHub Releases UI; release notes из коробки; чёткий ручной контроль / Cons: двухшаговый процесс (tag → release); требует ручного создания через UI или API
2. **`push: tags: ['v*']`** — Pros: один шаг (`npm version` + `git push --tags`); проще автоматизировать / Cons: нет встроенных release notes; любой с push-доступом может триггернуть; сложнее управлять draft/pre-release
3. **Оба + `workflow_dispatch`** — Pros: максимальная гибкость; manual re-run при сбоях / Cons: сложнее конфигурация; риск дублирования публикаций

**Risks**: Tag push без branch protection может быть случайно триггернут. Release event создаёт дополнительный ручной шаг, но даёт больше контроля.

**Researcher recommendation**: `release: types: [published]` — стандарт для проектов, где публикация контролируется вручную. Для проекта v0.1.0 ручной контроль наиболее безопасен.

---

### Q4: Node.js version — какую версию использовать в CI и для публикации?

**Context**: В `package.json` отсутствует поле `engines` — нет объявленного минимума Node.js. DevDependencies используют TypeScript 5.9.2 и Vitest 4.x. External research показал, что Node.js 20.x выходит на EOL в апреле 2026 (через месяц), 22.x — Maintenance LTS до апреля 2027, 24.x — Active LTS.

**Options**:
1. **Node 22.x** — Pros: поддержка до апреля 2027; совместимость с trusted publishing; актуальная LTS / Cons: не самая новая active LTS
2. **Node 24.x** — Pros: Active LTS; поддержка до апреля 2028; самая современная / Cons: пользователи на 22.x могут столкнуться с проблемами, если тесты проходят только на 24
3. **Matrix [22, 24]** — Pros: покрытие двух LTS; уверенность в совместимости / Cons: двойное время CI; для config-пакета избыточно
4. **Node 24.x (CI) + добавить `engines` field** — Pros: явная декларация минимума; единственная версия в CI / Cons: нужно решить какой минимум ставить

**Risks**: Без `engines` field пользователи не знают минимальную версию Node.js. Выбор только 24.x может скрыть проблемы на 22.x (хотя для config-пакета это маловероятно).

**Researcher recommendation**: Node 22.x для публикации (совместимость с trusted publishing при необходимости), одна версия без матрицы (config-пакет не имеет runtime-зависимостей от Node API). Добавление `engines` field — отдельный вопрос (Q7).

---

## Medium Priority

### Q5: Версионирование — ручное или автоматизированное?

**Context**: External research описал четыре подхода: ручной `npm version`, release-please, changesets, semantic-release. Проект на стадии v0.1.0, solo/small-team maintainer.

**Options**:
1. **Ручной** (`npm version` + push tag + GitHub Release) — Pros: нулевые зависимости; полный контроль; просто для solo-проекта / Cons: человеческий фактор; нет auto-changelog
2. **release-please** — Pros: авто-CHANGELOG; Release PR; Conventional Commits; GitHub Action / Cons: доп. зависимость; требует дисциплины в коммитах
3. **Вне scope** — версионирование не входит в задачу, сфокусироваться только на CI/publish pipeline

**Risks**: Добавление release-please увеличивает scope задачи. Ручное версионирование минимально и достаточно для начала.

**Researcher recommendation**: Ручное версионирование — достаточно для текущего scope. Автоматизацию можно добавить как отдельную задачу. TASK.md не упоминает версионирование в deliverables.

---

### Q6: npm provenance — включать или нет?

**Context**: npm provenance добавляет verification badge на npmjs.com и позволяет аудитировать supply chain. Требует `permissions: id-token: write` и `--provenance` флаг. Не работает с приватными репозиториями.

**Options**:
1. **Включить** (`npm publish --provenance --access public`) — Pros: бейдж на npm; supply chain верификация; рекомендуется npm / Cons: требует public repo; усложняет permissions
2. **Не включать** — Pros: проще workflow / Cons: нет бейджа; не соответствует best practices

**Risks**: Если репозиторий `fozy-labs/js-configs` приватный, provenance не сработает. Если публичный — нет причин не включать.

**Researcher recommendation**: Включить provenance если репозиторий публичный (codebase analysis указывает `homepage: https://github.com/fozy-labs/js-configs`, что предполагает публичность). Это одна строка в команде publish.

---

### Q7: Нужно ли добавить поле `engines` в package.json?

**Context**: Codebase analysis зафиксировал отсутствие `engines` в `package.json`. Без этого поля npm не предупреждает пользователей о несовместимых версиях Node.js. Выбор Node.js версии для CI (Q4) связан с этим.

**Options**:
1. **Добавить `engines`** с минимальной поддерживаемой версией (например, `"node": ">=22.0.0"`) — Pros: явная декларация; npm warn при несовместимости / Cons: расширяет scope задачи
2. **Не добавлять** — Pros: не выходит за scope / Cons: пользователи не знают ограничений
3. **Добавить в отдельном PR** — Pros: не смешивается с CI задачей / Cons: ещё одна задача

**Risks**: Минимальный риск — это декларативное поле, не блокирует установку (если `engine-strict` не включён).

**Researcher recommendation**: Добавить `engines` в рамках этой задачи (одна строка в `package.json`), так как выбор Node.js для CI и testing неразрывно связан с declared support.

---

### Q8: Уровень security hardening — минимальный или полный?

**Context**: External research описал несколько уровней защиты: pinning actions by SHA, Dependabot для actions, environment protection rules, CODEOWNERS, concurrency control, tag protection. Полная реализация всех мер увеличивает scope.

**Options**:
1. **Минимальный** — `permissions` per job, `npm ci`, `actions/setup-node` cache — Pros: быстрая реализация; достаточно для начала / Cons: actions pinned by tag (менее безопасно)
2. **Средний** — минимум + pinning by SHA + Dependabot для actions — Pros: защита от supply chain; автообновление / Cons: SHA менее читаемы; нужен `dependabot.yml`
3. **Полный** — средний + environments + CODEOWNERS + concurrency + tag protection — Pros: enterprise-grade / Cons: значительно расширяет scope; избыточно для small project

**Risks**: Pin by tag (e.g., `@v5`) уязвим к tag mutation attacks, но вероятность для official GitHub actions крайне мала. Полный hardening может быть wasteful для проекта с одним maintainer.

**Researcher recommendation**: Средний уровень — pin by SHA с комментарием версии + `dependabot.yml` для github-actions. Это стандарт для публичных проектов, не создаёт значительного overhead.

---

## Low Priority

### Q9: Scope инструкции по настройке — минимальный или подробный?

**Context**: TASK.md указывает deliverable `.mentall/cicd-setup.md` — user-facing guide на русском, покрывающий: настройку секретов, создание npm token, использование workflow. Вопрос в глубине описания — покрывать ли создание npm org, настройку trusted publishing на npmjs.com и т.д.

**Options**:
1. **Минимальный** — только конфигурация секретов GitHub + создание npm token + как делать release — Pros: быстро; фокус на essentials / Cons: новичку может не хватить контекста
2. **Подробный** — минимум + создание npm org/scope + настройка trusted publisher + troubleshooting — Pros: self-contained guide / Cons: больше работы; может устареть
3. **Минимальный + ссылки** — краткая инструкция с ссылками на npm/GitHub docs для деталей — Pros: баланс между полнотой и поддержкой / Cons: внешние ссылки могут устареть

**Risks**: Слишком краткая инструкция может быть бесполезна при первой настройке. Слишком подробная — больше maintenance burden.

**Researcher recommendation**: Минимальный + ссылки — покрыть конкретные шаги для этого проекта (имена секретов, тип токена, настройки npm access), а для общих тем (создание npm аккаунта, org) дать ссылки на официальную документацию.

---

### Q10: Нужен ли `workflow_dispatch` как ручной триггер для publish?

**Context**: `workflow_dispatch` позволяет вручную запустить publish workflow из GitHub UI. Полезен для повторной публикации при сбое или тестирования pipeline.

**Options**:
1. **Добавить** — Pros: fallback при сбоях; удобно для тестирования / Cons: может быть случайно триггернут; дублирует publish
2. **Не добавлять** — Pros: проще; один путь публикации / Cons: при сбое нужно создавать новый release или исправлять и re-trigger

**Risks**: npm не позволяет перезаписать опубликованную версию. Если publish прошёл частично (npm publish сработал, но шаг после упал), повторный запуск через `workflow_dispatch` завершится ошибкой `403 - version already exists`.

**Researcher recommendation**: Добавить `workflow_dispatch` без обязательных inputs — минимальная стоимость, полезен как safety net. Защита от случайного запуска обеспечивается тем, что npm не позволит перепубликовать ту же версию.

---

### Q11: Нужен ли отдельный CI шаг для `build` проверки на PR?

**Context**: TASK.md перечисляет tests, lint, type-checking для CI. Но `build` (`rimraf dist && tsc`) не упомянут явно для PR-проверки, хотя `ts-check` (`tsc --noEmit`) покрывает компиляцию без emit. Вопрос — запускать ли полный `build` на каждом PR или достаточно `ts-check`.

**Options**:
1. **Только `ts-check` + `ts-check:tests`** — Pros: быстрее; не создаёт артефактов; TASK.md упоминает type-checking / Cons: не проверяет, что `build` реально работает
2. **Полный `build`** — Pros: гарантирует, что dist/ генерируется без ошибок / Cons: медленнее; `tsc --noEmit` уже ловит те же ошибки
3. **`build` только в publish workflow** — Pros: build проверяется перед публикацией; CI быстрее / Cons: broken build обнаружится только при release

**Risks**: `tsc --noEmit` и `tsc` (build) проверяют одни и те же типы. Разница только в генерации файлов. Для config-пакета с простой структурой `tsc --noEmit` достаточно.

**Researcher recommendation**: `ts-check` в CI, полный `build` в publish workflow. Это соответствует TASK.md и оптимизирует время CI.

## User Answers

### Q1: Аутентификация npm
**Decision**: OIDC (Trusted Publishing). Первая публикация вручную (`npm publish --access public`), далее CI через OIDC.

### Q2: Структура workflow
**Decision**: Два файла (`ci.yml` + `publish.yml`) с `workflow_run` — publish зависит от CI.

### Q3: Триггер публикации
**Decision**: `push: tags: ['v*']` — один шаг через `npm version` + `git push --tags`.

### Q4: Версия Node.js
**Decision**: Node 22.x, одна версия без матрицы.

### Q5: Версионирование
**Decision**: Ручное (`npm version` + push tag).

### Q6: npm provenance
**Decision**: Включить (`--provenance`).

### Q7: Поле engines
**Decision**: Добавить `engines` в `package.json` в рамках этой задачи.

### Q8: Security hardening
**Decision**: Средний уровень — SHA pinning + `dependabot.yml` для github-actions.

### Q9: Setup инструкция
**Decision**: Минимальный + ссылки на официальные docs.

### Q10: workflow_dispatch
**Decision**: Не добавлять. Один путь публикации.

### Q11: Build в CI
**Decision**: Проверка типов, форматирование, тесты (проверка их типов) в CI. Полный build в publish workflow.
