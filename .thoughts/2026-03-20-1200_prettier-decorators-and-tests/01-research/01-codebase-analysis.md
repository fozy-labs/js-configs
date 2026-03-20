---
title: "Prettier Decorators & Tests — Codebase Analysis"
date: 2026-03-20
stage: 01-research
role: rdpi-codebase-researcher
workflow: b0.4
---

## Summary

The `@fozy-labs/js-configs` repository exports shared ESLint, Prettier, TypeScript, and Vitest configurations. The Prettier config uses `@ianvs/prettier-plugin-sort-imports` for import sorting with five-group ordering (builtins, third-party, `@/`, `../`, `./`) but has no decorator-related options. Test coverage exists for config shape verification, snapshot stability, and integration formatting, but import sorting is tested only superficially (one fixture with three imports, builtin-before-third-party assertion only) and decorator formatting is not tested at all.

## Findings

### 1. Prettier Configuration

- **Location**: `@/src/prettier/index.ts:1-19`
- **Exported config object**:
  - `tabWidth`: `4`
  - `printWidth`: `120`
  - `plugins`: `["@ianvs/prettier-plugin-sort-imports"]`
  - `importOrder`: 9 entries (5 patterns + 4 empty-string separators):
    1. `<BUILTIN_MODULES>`
    2. `""` (blank line)
    3. `<THIRD_PARTY_MODULES>`
    4. `""` (blank line)
    5. `^@/(.*)$`
    6. `""` (blank line)
    7. `^\\.\\./(.*)`
    8. `""` (blank line)
    9. `^\\./(.*)$`
- **Decorator-related options**: None. No `experimentalDecorators`, no `importOrderParserPlugins`, no `parser` override. The `@ianvs/prettier-plugin-sort-imports` plugin supports an `importOrderParserPlugins` option (default `["typescript", "jsx"]`), but it is not set in this config.
- **Other Prettier options absent**: `semi`, `singleQuote`, `trailingComma`, `arrowParens`, `endOfLine` — all use Prettier defaults.

### 2. Prettier Config Unit Test

- **Location**: `@/src/prettier/__tests__/prettier-config.test.ts:1-12`
- **Test cases**:
  - **T6: "exports correct config values"** — asserts `tabWidth === 4`, `printWidth === 120`, `plugins` contains `"@ianvs/prettier-plugin-sort-imports"`, `importOrder` has length 9.
- **Import sorting coverage**: Only checks array length (9), does not verify individual patterns or separator positions.
- **Decorator coverage**: None.

### 3. Integration Tests

- **Location**: `@/src/__tests__/integration.test.ts:1-148`
- **Sections**:
  - `describe("ESLint integration")`:
    - **T19**: lints `valid.ts` without errors
    - **T20**: reports violations in `violation.ts`
    - **T21**: type-aware rules fire correctly (no parser errors)
  - `describe("Prettier integration")`:
    - **T22: "reformats unformatted.ts with correct settings"** — formats fixture, asserts output differs from input, checks 4-space indentation.
    - **T23: "sorts imports correctly via plugin"** — formats `unsorted-imports.ts`, asserts `node:fs` appears before `express` in output. Uses `if (fsIndex !== -1 && expressIndex !== -1)` guard — if either import is missing, the assertion is silently skipped.
  - `describe("TypeScript integration")`:
    - **T24**: compiles valid project
    - **T25**: strict mode catches implicit any
    - **T26**: test tsconfig recognizes vitest globals
- **Import sorting coverage**: T23 tests builtin-before-third-party ordering only. Does not test `@/` alias imports, relative imports, or blank-line separation between groups.
- **Decorator coverage**: None.

### 4. Snapshot Tests

- **Location**: `@/src/__tests__/snapshots.test.ts:1-32`
- **Test cases**:
  - **T15**: ESLint config snapshot (serializable subset — name, rules, ignores, files)
  - **T16**: Prettier config snapshot (full config object)
  - **T17**: Vitest config snapshot (full config object)
  - **T18**: CLI templates snapshot (editorconfig, gitignore, prettierignore)
- **Snapshot file**: `@/src/__tests__/__snapshots__/snapshots.test.ts.snap` — single file, contains all four snapshots.
- **Prettier snapshot content** (lines ~588-603): `{ importOrder: [...], plugins: [...], printWidth: 120, tabWidth: 4 }`. Any change to prettier config will require snapshot update.

### 5. TypeScript Config Tests

- **Location**: `@/src/__tests__/typescript-config.test.ts:1-41`
- **Test cases**:
  - **T11**: `tsconfig.base.json` has exactly 13 `compilerOptions` keys
  - **T12**: base config excludes path-sensitive options (ADR-3)
  - **T13**: `tsconfig.test.json` has vitest globals and `noEmit`
  - **T14**: `tsconfig.test.json` has no extends key
- **Decorator coverage**: None. Note: `tsconfig.base.json` does not have `experimentalDecorators` or `emitDecoratorMetadata`.

### 6. ESLint Config Tests

- **Location**: `@/src/eslint/__tests__/eslint-config.test.ts:1-68`
- **Test cases**:
  - **T1**: exports non-empty array
  - **T2**: named configs have `@fozy-labs/js-configs/` prefix
  - **T3**: has `projectService: true`
  - **T4**: no `tsconfigRootDir` anywhere (ADR-4)
  - **T5**: last element is prettier compat config
- **Decorator / import sorting coverage**: None.

### 7. Vitest Config Tests

- **Location**: `@/src/vitest/__tests__/vitest-config.test.ts:1-28`
- **Test cases**:
  - **T7**: exports plain object with `test` key
  - **T8**: core test settings (globals, environment, pool, coverage thresholds)
  - **T9**: no `resolve.alias` (ADR-5)
  - **T10**: no `coverage.include` (ADR-2)
- **Decorator / import sorting coverage**: None.

### 8. CLI Tests

- **Location**: `@/src/cli/__tests__/cli.test.ts:1-92`
- **Test cases**:
  - **T29**: fresh init creates all 3 dot files
  - **T30**: existing file not overwritten without `--force`
  - **T31**: `--force` overwrites existing files
  - **T32**: mixed create/skip scenarios
- **Decorator / import sorting coverage**: None.

### 9. Fixture Files — Prettier Project

- **Location**: `@/src/__tests__/fixtures/prettier-project/`
- **Files**:
  - `unformatted.ts` (`@/src/__tests__/fixtures/prettier-project/unformatted.ts:1-5`): Simple code with `const x = 1`, arrow function, export. Used by T22 to test reformatting. No imports, no decorators.
  - `unsorted-imports.ts` (`@/src/__tests__/fixtures/prettier-project/unsorted-imports.ts:1-6`): Three imports in wrong order:
    1. `import { resolve } from "./local";` (with `@ts-ignore`)
    2. `import { readFileSync } from "node:fs";`
    3. `import express from "express";` (with `@ts-ignore`)
    Then `export { resolve, readFileSync, express };`. Used by T23 to test import sorting plugin. No `@/` alias imports, no `../` relative imports. No decorators.

### 10. Fixture Files — ESLint Project

- **Location**: `@/src/__tests__/fixtures/eslint-project/`
- **Files**:
  - `valid.ts`: `const greeting: string = "hello"; export { greeting };`
  - `violation.ts`: Unused variable without underscore prefix (triggers `@typescript-eslint/no-unused-vars`).
  - `tsconfig.json`: Minimal config extending nothing, used for ESLint type-aware linting fixture.

### 11. ESLint Configuration (source)

- **Location**: `@/src/eslint/index.ts:1-56`
- **Structure**: Array of 6 config objects:
  1. `@fozy-labs/js-configs/ignores` — ignore patterns
  2. `js.configs.recommended` — ESLint recommended rules
  3. `...tseslint.configs.strict` — TypeScript strict ruleset
  4. `@fozy-labs/js-configs/parser` — `projectService: true`
  5. `@fozy-labs/js-configs/rules` — custom overrides (`no-explicit-any: off`, `no-non-null-assertion: off`, `no-extraneous-class: off`, `no-dynamic-delete: off`, `no-invalid-void-type: off`, unused-vars with underscore ignore patterns)
  6. `eslintConfigPrettier` — prettier compat (last position)
- **Decorator rules**: None. No decorator-specific ESLint rules.
- **Import sorting rules**: None. Import sorting is handled by Prettier plugin, not ESLint.

### 12. Vitest Configuration (source)

- **Location**: `@/src/vitest/index.ts:1-24`
- **Exported config**: `{ test: { globals: true, environment: "jsdom", setupFiles: ["src/__tests__/setup.ts"], include: [...], coverage: { provider: "v8", exclude: [...], thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 } }, pool: "forks" } }`

### 13. Vitest Runner Configuration

- **Location**: `@/vitest.config.ts:1-13`
- **Setup**: `globals: true`, includes `src/**/*.test.ts`, excludes `src/__tests__/fixtures/**`, coverage provider `v8` covering `src/eslint/**`, `src/prettier/**`, `src/vitest/**`, `src/cli/**`.

### 14. Dependencies

- **Location**: `@/package.json:1-85`
- **Prettier-related**:
  - `prettier`: `^3.5.0` (peerDependency + devDependency)
  - `@ianvs/prettier-plugin-sort-imports`: `^4.4.0` (dependency)
- **ESLint-related**:
  - `eslint`: `^9.20.0` (peerDependency + devDependency)
  - `@eslint/js`: `^9.20.0` (dependency)
  - `typescript-eslint`: `^8.25.0` (dependency)
  - `eslint-config-prettier`: `^10.1.0` (dependency)
- **TypeScript**:
  - `typescript`: `^5.0.0` (peerDependency), `5.9.2` (devDependency pinned)
- **Test-related**:
  - `vitest`: `^4.0.0` (peerDependency), `^4.0.18` (devDependency)
  - `@vitest/coverage-v8`: `^4.0.18` (devDependency)
  - `jsdom`: `^28.1.0` (devDependency)
- **Other**:
  - `@types/node`: `^22.0.0` (devDependency)
  - `jiti`: `^2.4.0` (devDependency)
  - `rimraf`: `6.1.2` (devDependency)

### 15. TypeScript Shared Configs

- **Base** (`@/typescript/tsconfig.base.json:1-16`): 13 `compilerOptions` keys — `target: ESNext`, `module: ESNext`, `lib: [DOM, ESNext]`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`, `moduleResolution: bundler`, `resolveJsonModule: true`, `isolatedModules: true`, `noEmitOnError: true`, `declaration: true`, `jsx: react-jsx`. No `experimentalDecorators`, no `emitDecoratorMetadata`.
- **Test** (`@/typescript/tsconfig.test.json:1-6`): `types: ["vitest/globals"]`, `noEmit: true`. No `extends`.

## Code References

- `@/src/prettier/index.ts:1-19` — Prettier config definition (tabWidth, printWidth, plugins, importOrder)
- `@/src/prettier/index.ts:6` — plugin reference: `"@ianvs/prettier-plugin-sort-imports"`
- `@/src/prettier/index.ts:7-17` — importOrder array (5 patterns + 4 separators)
- `@/src/prettier/__tests__/prettier-config.test.ts:1-12` — T6: config shape test
- `@/src/__tests__/integration.test.ts:88-110` — T22: unformatted.ts reformatting test
- `@/src/__tests__/integration.test.ts:113-126` — T23: import sorting test (builtin before third-party only)
- `@/src/__tests__/fixtures/prettier-project/unsorted-imports.ts:1-6` — import sorting fixture (3 imports: local, builtin, third-party)
- `@/src/__tests__/fixtures/prettier-project/unformatted.ts:1-5` — formatting fixture (no imports)
- `@/src/__tests__/snapshots.test.ts:9-16` — T16: prettier config snapshot test
- `@/src/__tests__/__snapshots__/snapshots.test.ts.snap:588-603` — prettier config snapshot data
- `@/src/eslint/index.ts:1-56` — ESLint config (no decorator or import sorting rules)
- `@/src/vitest/index.ts:1-24` — Vitest shared config
- `@/vitest.config.ts:1-13` — Vitest runner config
- `@/package.json:59` — `@ianvs/prettier-plugin-sort-imports: ^4.4.0`
- `@/package.json:67` — `prettier: ^3.5.0` (peerDependency)
- `@/package.json:73` — `prettier: ^3.5.0` (devDependency)
- `@/typescript/tsconfig.base.json:1-16` — base tsconfig (no decorator options)
