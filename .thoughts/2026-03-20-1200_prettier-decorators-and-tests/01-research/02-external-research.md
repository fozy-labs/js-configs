---
title: "External Research: Prettier Decorators & Import Sorting Plugins"
date: 2026-03-20
stage: 01-research
role: rdpi-external-researcher
workflow: b0.4
---

## Comparative Analysis

### Import Sorting Plugins

| Library | Approach | Pros | Cons | Confidence |
|---------|----------|------|------|------------|
| `@ianvs/prettier-plugin-sort-imports` ^4.4.0 | Babel AST manipulation; fork of trivago with enhancements | Does not re-order across side-effect imports by default; combines imports from same source; `<TYPES>` keyword; `<BUILTIN_MODULES>` keyword; empty-string separator groups; comment preservation; `importOrderSafeSideEffects` escape hatch; `@prettier/plugin-oxc` compatibility (Prettier 3.6+) | Modifies AST (against Prettier rules — documented disclaimer); relies on Babel parser internally which may diverge from Prettier's TypeScript parser | **High** |
| `@trivago/prettier-plugin-sort-imports` ^6.0.0 | Babel AST manipulation; original plugin | `<BUILTIN_MODULES>` support; `importOrderSortByLength`; `importOrderSideEffects` flag; `<SEPARATOR>` for explicit newline control; `importOrderImportAttributesKeyword` option; minimatch-based pattern matching | No `<TYPES>` keyword for type-import grouping; `importOrderSeparation` boolean is coarser than @ianvs empty-string approach; does NOT prevent re-ordering across side-effect imports by default; fewer options for type/value import merging | **High** |

### Prettier Versions & Decorator Support

| Prettier Version | Decorator Handling | Notes | Confidence |
|---|---|---|---|
| 2.x | Supported via Babel parser with `decorators-legacy` or `decorators` plugin | Both `babel` and `typescript` parsers handle decorators. No special Prettier option needed — Babel parser plugins control syntax. | **High** |
| 3.0 (July 2023) | Improved decorator formatting — e.g., PR #14409 removed unnecessary parentheses around decorated class expressions: `call(@dec class {})` | TC39 decorators (stage 3) syntax works through Babel parser. Prettier uses `@babel/parser` which supports both `decorators-legacy` (TypeScript `experimentalDecorators`) and `decorators` (TC39 proposal). | **High** |
| 3.1+ (Nov 2023) | Continued support; added new Babel 7.23 syntaxes | No new decorator-specific options. Decorator formatting follows standard Babel/TS parser behavior. | **High** |
| 3.3+ | `typescript` parser (via `@typescript-eslint/typescript-estree`) fully supports both legacy and TC39 decorators as supported by TypeScript 5.0+ | No Prettier-specific option like `experimentalDecorators`. Parser is determined by file extension or explicit `--parser` flag. | **High** |

## Established Practices

### 1. Prettier's Decorator Support Is Built-In — No Plugin Needed

Prettier formats decorators out of the box through its parsers. **There is no `experimentalDecorators` option in Prettier itself.** Decorator support is determined by:

- **`typescript` parser**: Uses `@typescript-eslint/typescript-estree`, which follows TypeScript's decorator support. TypeScript 5.0+ supports both legacy decorators (`experimentalDecorators: true` in tsconfig) and TC39 stage 3 decorators natively. Prettier's `typescript` parser inherits this.
- **`babel` parser**: Uses `@babel/parser` with plugins. Decorators are enabled via `decorators-legacy` (for legacy/experimental decorators) or `decorators` (for TC39 standard decorators) parser plugins.

Since Prettier auto-detects the parser from file extensions (`.ts`, `.tsx` → `typescript` parser), TypeScript files with decorators are formatted correctly without any additional configuration.

**Sources**: Prettier docs (parser options), Prettier 3.0 blog post (PR #14409 shows decorator handling), TypeScript 5.0 release notes.
**Confidence**: **High**

### 2. Import Sorting Plugins Use Babel Internally — `importOrderParserPlugins` Controls Decorator Parsing

Both `@ianvs/prettier-plugin-sort-imports` and `@trivago/prettier-plugin-sort-imports` parse code using **Babel's parser** internally (not Prettier's selected parser) to perform import reordering. This means:

- Default parser plugins: `["typescript", "jsx"]`
- For files with decorators, you must add `"decorators-legacy"` or `"decorators"` to `importOrderParserPlugins`
- For TC39 decorators with options: `"[\"decorators\", { \"decoratorsBeforeExport\": true }]"` (JSON string inside the array)

This is explicitly documented in both plugins' READMEs and Troubleshooting guides.

**Sources**: @ianvs/prettier-plugin-sort-imports README — `importOrderParserPlugins` section; @trivago/prettier-plugin-sort-imports README — `importOrderParserPlugins` section.
**Confidence**: **High**

### 3. `@ianvs/prettier-plugin-sort-imports` Key Advantages Over Trivago

The @ianvs fork was created to address specific shortcomings:

1. **Side-effect import safety**: Does not reorder imports across side-effect imports by default (trivago does by default since v6's `importOrderSideEffects: true` default, but can be disabled).
2. **Import combining**: Merges imports from the same source module.
3. **Type/value import combining**: When `importOrderTypeScriptVersion` is set to `"4.5.0"` or higher, uses TypeScript's mixed type and value import syntax (`import { type Foo, bar } from '...'`).
4. **`<TYPES>` keyword**: Allows grouping type-only imports separately.
5. **Empty string separators**: `""` in `importOrder` array inserts blank lines between groups (trivago uses `importOrderSeparation: true` boolean or `<SEPARATOR>` keyword in v6).
6. **Comment handling**: More robust preservation of comments around imports.
7. **`@prettier/plugin-oxc` compatibility**: Documented compatibility with Prettier 3.6+ Oxc plugin.

**Sources**: @ianvs/prettier-plugin-sort-imports README (feature list at top), GitHub repo.
**Confidence**: **High**

### 4. Alias Path Handling (`@/...`)

Both plugins use regex patterns for `importOrder`. Handling `@/...` alias paths requires careful regex to avoid collision with scoped npm packages (`@scope/pkg`):

- **`@ianvs` recommended pattern**: `"^(@api|@assets|@ui)(/.*)$"` — explicitly list known alias prefixes. Or use `"^@/(.*)$"` if your aliases all use `@/`.
- The `<THIRD_PARTY_MODULES>` special word catches all imports not matched by custom patterns. Scoped packages like `@scope/pkg` are treated as third-party by default unless matched by a custom regex.
- **Key distinction**: `^@/(.*)$` matches `@/components/...` but NOT `@scope/package` (because `@scope/` has no `/` immediately after `@`).

**Sources**: @ianvs README examples #5 and #6 ("Group aliases with local imports").
**Confidence**: **High**

### 5. Prettier Plugin Compatibility (Multiple Plugins)

When using multiple Prettier plugins together, order in the `plugins` array can matter. Key findings:

- `@ianvs/prettier-plugin-sort-imports` with `@prettier/plugin-oxc`: The sort-imports plugin MUST be listed after the oxc plugin: `plugins: ['@prettier/plugin-oxc', '@ianvs/prettier-plugin-sort-imports']`.
- `prettier-plugin-tailwindcss` (if used): Tailwind's plugin has documented compatibility with sort-imports plugins. Tailwind plugin should generally be listed last.
- Both import-sorting plugins **modify the AST** (which is against Prettier's official plugin rules). This is a known compromise, explicitly stated as a disclaimer in both READMEs.

**Sources**: @ianvs README "Usage with @prettier/plugin-oxc" section; prettier-plugin-tailwindcss docs.
**Confidence**: **High** (plugin ordering), **Medium** (Tailwind interaction — from community reports)

## Opinions and Speculation

### 1. "@ianvs Is the De Facto Standard" — Community Preference

The @ianvs fork appears to have become the preferred choice in the community for new projects, primarily due to:
- Safer side-effect import handling
- Better TypeScript type import support (`<TYPES>` keyword)
- More flexible separator configuration
- Active maintenance

However, @trivago's v6 release (approximately 5 months before this research date) added several features that narrow the gap: `<BUILTIN_MODULES>`, `importOrderSideEffects`, `importOrderSortByLength`, and `importOrderImportAttributesKeyword`.

**Source**: Community discussions, npm download trends, GitHub stars comparison.
**Confidence**: **Medium** — preference is subjective; both are actively maintained.

### 2. Testing Shared Prettier Configs

No widely established standard exists for testing shared Prettier configs. Common approaches:

- **Config shape testing** (assertion-based): Verify exported config has expected keys/values. Simple but doesn't catch formatting regressions.
- **Snapshot testing**: Format fixture files with the config, compare against snapshots. Catches formatting regressions but snapshots can be noisy.
- **Integration testing**: Call `prettier.format()` programmatically with the config and assert on specific output. Most thorough.
- **`prettier --check`**: Run Prettier in check mode against fixture files to ensure they are already formatted. Simple binary pass/fail.

Most shared config packages in the ecosystem do minimal testing (if any). Well-maintained ones like `eslint-config-airbnb` rely more on the underlying tool's test suite.

**Source**: Various open-source shared config packages on GitHub.
**Confidence**: **Low** — no single established standard; practices vary widely.

## Pitfalls

### 1. `importOrderParserPlugins` Must Include Decorator Support for Files with Decorators

**Problem**: If your codebase uses decorators (e.g., NestJS, Angular, MobX) and you forget to add `"decorators-legacy"` or `"decorators"` to `importOrderParserPlugins`, the import sorting plugin will fail to parse those files and throw:

```
SyntaxError: This experimental syntax requires enabling one of the following parser plugin(s): 'decorators-legacy', 'decorators'
```

**Solution**: Add to your Prettier config:
```json
"importOrderParserPlugins": ["typescript", "jsx", "decorators-legacy"]
```

Or for TC39 standard decorators:
```json
"importOrderParserPlugins": ["typescript", "jsx", "[\"decorators\", { \"decoratorsBeforeExport\": true }]"]
```

**Sources**: Both plugins' Troubleshooting docs; GitHub issues on both repos.
**Confidence**: **High**

### 2. `decorators-legacy` vs `decorators` — Choosing the Right Babel Plugin

- **`decorators-legacy`**: Corresponds to TypeScript's `experimentalDecorators: true`. Decorator placed before `export`: `@dec export class Foo {}`. This is what most existing TypeScript projects use (NestJS, Angular, MobX).
- **`decorators`**: Corresponds to TC39 stage 3 decorators. Requires options like `{ "decoratorsBeforeExport": true }`. This is the newer standard supported by TypeScript 5.0+ (without `experimentalDecorators` flag).

Using the wrong one causes parse errors in the import sorting plugin even if Prettier itself formats the file correctly (because Prettier uses a different parser).

**Sources**: Babel parser plugin docs; TypeScript 5.0 release notes.
**Confidence**: **High**

### 3. Side-Effect Imports Can Be Silently Reordered

With `@trivago/prettier-plugin-sort-imports` (default `importOrderSideEffects: true`), side-effect imports like `import './polyfill'` or `import 'reflect-metadata'` are sorted along with other imports. This can break applications that depend on side-effect import order.

`@ianvs/prettier-plugin-sort-imports` treats side-effect imports as "barriers" by default — they are not moved, and other imports cannot cross them during sorting. The `importOrderSafeSideEffects` option allows explicitly marking certain side-effect imports as safe to sort.

**Sources**: @ianvs README "How does import sort work?" section; @trivago README `importOrderSideEffects` option.
**Confidence**: **High**

### 4. Plugin Order Matters When Using Multiple Prettier Plugins

If sort-imports is used alongside other Prettier plugins that also process JS/TS (e.g., `@prettier/plugin-oxc`), plugin array order determines which plugin's parser takes precedence. Incorrect ordering can cause the import sorting to silently not work or throw errors.

**Sources**: @ianvs README "Usage with @prettier/plugin-oxc".
**Confidence**: **High**

### 5. `@/` Alias Pattern Can Match Scoped Packages If Regex Is Too Broad

A regex like `^@(.*)$` will match both `@/components/Button` (alias) and `@types/node` (scoped package). Always use a specific pattern like `^@/(.*)$` (with the literal `/` after `@`) to distinguish aliases from scoped packages.

**Sources**: @ianvs README example #6; a recurring question in GitHub issues.
**Confidence**: **High**

## Performance

### Import Sorting Plugin Performance

Both plugins perform Babel parsing on every file during formatting. This adds overhead compared to Prettier alone:

- The parsing is done per-file and is not cached between format runs.
- For large codebases, this can noticeably slow down `prettier --write .` or CI check runs.
- No published benchmarks comparing the two plugins' performance exist.
- `@ianvs/prettier-plugin-sort-imports` notes compatibility with `@prettier/plugin-oxc` (Prettier 3.6+), which uses the Oxc parser (Rust-based) — this could offer performance benefits if the oxc plugin handles parsing duties, though the sort-imports plugin still does its own Babel parse for import extraction.

**Sources**: Plugin architecture (both use Babel parser internally); @ianvs README oxc section.
**Confidence**: **Medium** — no benchmarks available; architecture-based inference.

### Prettier's Own Decorator Performance

No known performance issues with Prettier's decorator formatting. The `typescript` parser handles decorators as part of normal AST construction. No additional cost compared to files without decorators.

**Sources**: No performance-specific docs or issues found.
**Confidence**: **Medium** — absence of reports suggests no issues.

## Testing Patterns for Shared Prettier Configs

### Approaches Found in the Ecosystem

| Pattern | Description | Pros | Cons | Used By | Confidence |
|---------|-------------|------|------|---------|------------|
| Config shape assertions | Test that `config.tabWidth === 4`, `config.plugins` includes expected plugins | Fast, deterministic, no side effects | Doesn't verify actual formatting behavior | This project (`@fozy-labs/js-configs`) | **High** |
| Snapshot testing with fixtures | Create fixture files, format them, snapshot the output | Catches formatting regressions; documents expected output | Snapshots can be large and noisy; require updates on Prettier version bumps | Some open-source shared configs | **Medium** |
| Programmatic `prettier.format()` | Call Prettier API with config and assert on specific output characteristics | Most precise; tests actual formatting behavior | More code to maintain; tightly coupled to Prettier output | Less common in shared configs | **Medium** |
| `prettier --check` on fixtures | Run Prettier CLI against pre-formatted fixture files | Simple; validates that fixtures match config | Binary pass/fail — no detail on what changed | CI-focused approaches | **Medium** |
| Integration tests with real files | Use real project files as fixtures, format and verify no changes | Realistic; catches edge cases | Slow; fragile (changes in source mean test changes) | Rare | **Low** |

### Recommended Combination for Robust Testing

Based on patterns across the ecosystem:

1. **Config shape test** — fast smoke test that export is correct (currently done in this project)
2. **Fixture snapshot tests** — format representative fixture files covering key scenarios (imports ordering, decorator files, edge cases) and snapshot the output
3. **Integration test** — format a fixture project with `prettier.format()` or CLI and verify specific expectations

**Sources**: Various open-source shared config packages; Prettier's own test suite uses snapshot testing extensively.
**Confidence**: **Medium** — synthesized from multiple approaches, no single standard.

## Sources

- [Prettier 3.0 Release Blog](https://prettier.io/blog/2023/07/05/3.0.0) — decorator formatting improvements (PR #14409), ESM migration, breaking changes
- [Prettier 3.1 Release Blog](https://prettier.io/blog/2023/11/13/3.1.0) — new Babel 7.23 syntax support, continued parser improvements
- [Prettier Options Documentation](https://prettier.io/docs/options) — full list of Prettier options; confirms no `experimentalDecorators` option exists
- [@ianvs/prettier-plugin-sort-imports README](https://github.com/IanVS/prettier-plugin-sort-imports/blob/main/README.md) — full API docs, import order patterns, `importOrderParserPlugins` (including decorator config), compatibility table, `@prettier/plugin-oxc` usage
- [@ianvs/prettier-plugin-sort-imports Troubleshooting](https://github.com/IanVS/prettier-plugin-sort-imports/blob/main/docs/TROUBLESHOOTING.md) — experimental syntax errors, pnpm issues, Vue SFC handling
- [@trivago/prettier-plugin-sort-imports README](https://github.com/trivago/prettier-plugin-sort-imports/blob/main/README.md) — full API docs (v6), `importOrderSideEffects`, `importOrderSortByLength`, `importOrderImportAttributesKeyword`, `<BUILTIN_MODULES>`, `importOrderParserPlugins` with decorator support
- [Babel Parser Plugins Documentation](https://babeljs.io/docs/babel-parser#plugins) — `decorators-legacy` vs `decorators` plugin options
- [TypeScript 5.0 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/) — TC39 stage 3 decorators support
