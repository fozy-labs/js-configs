---
title: "Open Questions: Prettier Decorators & Import Sorting Tests"
date: 2026-03-20
stage: 01-research
role: rdpi-questioner
workflow: b0.4
---

## High Priority

### Q1: `decorators-legacy` vs `decorators` — Which Babel Parser Plugin for `importOrderParserPlugins`?

**Context**: The task specifies "ECMA stage 3" decorator support. Prettier itself handles decorators natively via its `typescript` parser — no config change is needed for *formatting*. However, the `@ianvs/prettier-plugin-sort-imports` plugin uses Babel internally for parsing, and Babel requires an explicit parser plugin to handle decorator syntax. Without it, files containing decorators will throw `SyntaxError` during import sorting. The choice between `decorators-legacy` and `decorators` affects which decorator syntax the plugin can parse.

**Options**:
1. **`decorators-legacy`** — Corresponds to TypeScript's `experimentalDecorators: true`. Used by NestJS, Angular, MobX, and most existing TS projects. Simpler to configure (no options object needed). Pros: broadest ecosystem compatibility, no config nesting. Cons: maps to the older decorator proposal, not TC39 stage 3.
2. **`decorators`** (with options, e.g. `{ "decoratorsBeforeExport": true }`) — Corresponds to TC39 stage 3 decorators, supported by TypeScript 5.0+ without `experimentalDecorators` flag. Pros: aligns with the task's stated "ECMA stage 3" goal, future-proof. Cons: requires nested JSON-in-string syntax in the config array (`["decorators", { "decoratorsBeforeExport": true }]"`), more complex config; consumers using legacy decorators would get parse errors.
3. **Both** — Include `decorators-legacy` for broad compatibility. Babel only allows one of the two in a single parse, so this is not possible.

**Risks**: Choosing `decorators` but having consumers that use `experimentalDecorators: true` in their tsconfig will cause the import sorting plugin to fail on those files. Choosing `decorators-legacy` contradicts the task's "ECMA stage 3" requirement. The two plugins are mutually exclusive in Babel — only one can be active per parse.

**Researcher recommendation**: The task explicitly says "ECMA stage 3", and `tsconfig.base.json` does not set `experimentalDecorators: true`, which aligns with TC39 decorators. The `decorators` plugin with `{ "decoratorsBeforeExport": true }` matches the task intent. However, the practical impact on downstream consumers who may still use legacy decorators needs a decision.

---

### Q2: Should `importOrderParserPlugins` Be Added or Left at Its Default?

**Context**: Currently the Prettier config does not set `importOrderParserPlugins`. The `@ianvs/prettier-plugin-sort-imports` plugin defaults to `["typescript", "jsx"]`. This default does NOT include any decorator parser plugin, meaning files with decorators will fail during import sorting. Adding `importOrderParserPlugins` changes the exported config shape, which will break the snapshot test (T16) and the config shape test (T6, which asserts `importOrder` length = 9 — though this specific assertion is unaffected, the snapshot will change).

**Options**:
1. **Add `importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"]`** (or with `"decorators"`) — Explicitly enables decorator parsing. Pros: fixes decorator parse errors in import sorting. Cons: adds a new key to config, snapshot update required, slightly more complex config.
2. **Do not add it** — Rely on Prettier's own `typescript` parser for formatting, and accept that the import sorting plugin cannot handle files with decorators. Pros: simpler config. Cons: import sorting will throw on decorator files — directly contradicts the task goal.

**Risks**: Not adding it means the "decorator support" objective is only partially met — Prettier formats decorators fine, but the import sorting plugin chokes on them. This is almost certainly not acceptable.

**Researcher recommendation**: Adding `importOrderParserPlugins` is necessary to fully satisfy objective #1. The snapshot and potentially the config shape test will need updates.

---

### Q3: Which Tests Are Currently Failing, and Are They Related to This Task?

**Context**: The task states "Fix all currently failing tests." The codebase analysis identifies 32 test cases across 6 test files. The research does not include a test run output showing which specific tests fail. Failing tests could be:
- Pre-existing breakage unrelated to decorators/imports (e.g., dependency version updates, snapshot drift, fixture changes)
- Tests that will fail *after* the config changes are made (snapshot T16 due to config shape change)

**Options**:
1. **Run tests first, categorize failures** — Before making any code changes, run `vitest` and catalog each failure as "pre-existing" vs. "will be caused by our changes." Fix pre-existing failures first, then make task changes, then fix resulting failures.
2. **Make changes first, then fix all failures** — Implement decorator support and new test fixtures, then fix everything that breaks. Pros: fewer iterations. Cons: harder to attribute failures to root causes.

**Risks**: If pre-existing failures are entangled with the changes this task introduces, debugging becomes harder. Without a test run, the scope of "fix all failing tests" is unknown — it could be trivial (snapshot updates) or substantial (broken integration tests).

**Researcher recommendation**: Option 1 — run tests before any changes to establish a baseline. This is a blocking question: the implementation plan cannot accurately estimate scope without knowing the current failure state.

---

## Medium Priority

### Q4: Import Sorting Test Fixture Strategy — New File or Extend Existing?

**Context**: The current `unsorted-imports.ts` fixture has only 3 imports (local `./`, builtin, third-party). The task requires testing 5 import path patterns: `@external`, `@/shared`, `../../../relative`, `../../another`, `./local`. The existing fixture doesn't cover `@/` aliases or `../` relative imports.

**Options**:
1. **Extend `unsorted-imports.ts`** — Add the missing import patterns to the existing fixture. Pros: no new files, single source of truth. Cons: T23 (existing integration test) logic depends on finding `node:fs` and `express` — adding more imports changes ordering and may break T23's indexOf assertions.
2. **Create a new fixture file** (e.g., `import-sorting-comprehensive.ts`) — Dedicated fixture with all 5 patterns in intentionally wrong order. Pros: clean separation, T23 remains stable, the new test can assert full group ordering. Cons: fixture file proliferation.
3. **Replace `unsorted-imports.ts`** entirely with a comprehensive version — Remove old fixture, create new one with all patterns. Pros: single fixture. Cons: must update T23 assertions, risk of breaking existing test intent.

**Risks**: Extending the existing fixture risks silently breaking T23 (it uses indexOf with a guard that silently skips assertion if imports aren't found). Creating a new file without updating T23 leaves the weak existing test in place.

**Researcher recommendation**: Option 2 (new fixture + new test) is safest, but T23's silent-skip guard (`if (fsIndex !== -1 && expressIndex !== -1)`) should also be fixed regardless — it can mask real failures.

---

### Q5: How Should the Import Sorting Test Assert Correctness?

**Context**: T23 currently uses `indexOf` on formatted output to check that `node:fs` appears before `express`. This is fragile and doesn't verify blank-line separators between groups or the full 5-group ordering. The task requires testing various import path patterns, implying more thorough assertions.

**Options**:
1. **Line-by-line regex matching** — Split output by lines, match each import line to its expected group, verify groups appear in order with blank-line separators between them. Pros: precise, verifiable. Cons: verbose test code, brittle to minor Prettier formatting changes.
2. **Snapshot testing** — Format the fixture, snapshot the output. Pros: captures exact output including blank lines, easy to update. Cons: snapshots are opaque, changes need manual review, can be noisy on Prettier version bumps.
3. **Group-order assertion** — Extract import paths from output (regex), classify each into its group, assert groups are in the expected order. Pros: tests the semantic ordering without being tied to exact formatting. Cons: more complex test code.
4. **Combination**: Snapshot for the full output + a few targeted assertions on group ordering. Pros: best of both worlds. Cons: redundant.

**Risks**: Over-precise tests (line-by-line) break on minor Prettier updates. Under-precise tests (indexOf only) miss regressions. The current approach already demonstrates this risk — T23 can silently pass when imports are missing.

**Researcher recommendation**: Option 3 (group-order assertion) for the semantic test, optionally supplemented by a snapshot (option 4). This balances precision with maintainability.

---

### Q6: Should `experimentalDecorators` / `emitDecoratorMetadata` Be Added to `tsconfig.base.json`?

**Context**: The task says "ECMA stage 3 decorators." TypeScript 5.0+ supports TC39 stage 3 decorators *without* `experimentalDecorators`. The current `tsconfig.base.json` has neither `experimentalDecorators` nor `emitDecoratorMetadata`. Adding them would enable *legacy* decorators, which contradicts the task's stage 3 intent. However, some consumers of this shared config may use frameworks (NestJS, Angular) that require `experimentalDecorators`.

**Options**:
1. **Do not add** — Keep tsconfig as-is. TC39 stage 3 decorators work without any tsconfig flag in TS 5.0+. Pros: aligned with task intent, simpler config. Cons: consumers using legacy decorator frameworks must add the flag themselves.
2. **Add `experimentalDecorators: true`** — Pros: backward compatible with NestJS/Angular/MobX consumers. Cons: contradicts "ECMA stage 3" task goal, adds to the 13 compilerOptions (breaks T11 which asserts exactly 13 keys).
3. **Document the decision** — Don't add it but document in README that consumers should add `experimentalDecorators` if needed.

**Risks**: Adding `experimentalDecorators` changes `tsconfig.base.json` shape (breaks T11 — asserts exactly 13 keys) and conflates legacy and stage 3 decorator semantics. Not adding it may confuse consumers who expect shared config to "just work" with legacy decorator frameworks.

**Researcher recommendation**: Do not add — the task says stage 3, and TypeScript 5.0+ handles them natively. This is a Prettier config task, not a TypeScript config task. However, this should be an explicit decision.

---

### Q7: Decorator Formatting Test — What Should Be Tested?

**Context**: The task says "add decorator support so that decorators are properly formatted." Since Prettier already formats decorators natively, the actual change is adding `importOrderParserPlugins` so the import sorting plugin doesn't break on decorator files. The question is what to test: decorator *formatting* (which already works), or decorator files surviving *import sorting* (which is the actual fix)?

**Options**:
1. **Test decorator formatting** — Create a fixture with decorators, format it, assert output is correct. Proves Prettier handles decorators. Pros: documents the behavior. Cons: tests existing Prettier behavior, not something this task changes.
2. **Test import sorting in files with decorators** — Create a fixture with decorators AND unsorted imports, format it, assert imports are sorted and decorators are preserved. Pros: directly tests the actual change (`importOrderParserPlugins`). Cons: more complex fixture.
3. **Both** — Pros: comprehensive. Cons: redundant if option 1 just validates existing behavior.

**Risks**: Only testing option 1 misses the actual regression scenario (import sorting failing on decorator files). Only testing option 2 might be seen as insufficient decorator coverage.

**Researcher recommendation**: Option 2 is the minimum — it directly validates the config change. Option 1 can be added as a low-effort bonus but isn't testing anything this task changes.

---

## Low Priority

### Q8: Should the `@ts-ignore` Comments in `unsorted-imports.ts` Be Preserved?

**Context**: The existing fixture uses `// @ts-ignore` before imports from non-existent modules (`./local`, `express`). This suppresses TypeScript errors since the fixture is not a real project. New fixtures with `@/shared`, `../../another`, etc. will also reference non-existent modules.

**Options**:
1. **Use `@ts-ignore`** on each import — Current approach. Pros: consistent. Cons: clutters the fixture, may interfere with import sorting if the plugin treats comments differently.
2. **Use `@ts-expect-error`** — Stricter, preferred in TypeScript projects. Pros: fails if the error goes away (self-documenting). Cons: same clutter issue.
3. **Exclude fixtures from TypeScript checking** — The fixture directory is already excluded from `vitest.config.ts` (`src/__tests__/fixtures/**`), but may still be picked up by `tsc`. Pros: clean fixtures without suppressions. Cons: requires ensuring fixtures are excluded from all tsconfig includes.

**Risks**: Minimal. Comment style is cosmetic. However, if the import sorting plugin treats `// @ts-ignore` as a "comment attached to import" and moves it with the import vs. leaves it in place, this could affect test assertions.

**Researcher recommendation**: Check if the sorting plugin preserves `@ts-ignore` comments attached to imports. If so, keep them for consistency. If not, consider excluding fixtures from tsc.

---

### Q9: `decoratorsBeforeExport` Option Value

**Context**: If using the `decorators` Babel parser plugin (TC39 stage 3), it requires a `decoratorsBeforeExport` option. The TC39 proposal allows decorators both before and after `export`, but the Babel plugin needs a default.

**Options**:
1. **`decoratorsBeforeExport: true`** — `@dec export class Foo {}`. Most common in existing JS/TS codebases and closer to legacy decorator syntax.
2. **`decoratorsBeforeExport: false`** — `export @dec class Foo {}`. TC39 proposal allows this but it's less common in practice.

**Risks**: Low — this only affects parsing in the import sorting plugin, not formatting. Prettier's own TypeScript parser handles both syntaxes. The choice only matters if a consumer writes `export @dec class` — using `decoratorsBeforeExport: true` would fail to parse that specific syntax.

**Researcher recommendation**: `true` — aligns with common conventions and existing TypeScript codebases. The TC39 spec allows both, but virtually all real-world code places decorators before `export`.

---

## User Answers

### Q1: `decorators-legacy` vs `decorators`
**Decision**: `decorators` (TC39 stage 3) — задача указывает stage 3, пользователь подтверждает.

### Q2: Добавлять `importOrderParserPlugins`?
**Decision**: Да, добавить `importOrderParserPlugins` с `decorators`.

### Q3: Стратегия с failing tests
**Decision**: Сначала реализовать изменения, потом починить все тесты.

### Q4: Стратегия фикстур для тестов
**Decision**: На усмотрение (делегировано на этап дизайна).

### Q5: Подход к assertions
**Decision**: На усмотрение (делегировано на этап дизайна).

### Q6: tsconfig.base.json
**Decision**: Не менять tsconfig — TC39 stage 3 работает в TS 5.0+ без `experimentalDecorators`.

### Q7: Что тестировать для декораторов?
**Decision**: На усмотрение (делегировано на этап дизайна).

### Q8: @ts-ignore в фикстурах
**Decision**: На усмотрение (делегировано на этап дизайна).

### Q9: `decoratorsBeforeExport`
**Decision**: На усмотрение (делегировано на этап дизайна; рекомендация исследователя: `true`).
