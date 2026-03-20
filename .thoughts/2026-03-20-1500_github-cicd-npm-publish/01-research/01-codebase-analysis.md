---
title: "GitHub CI/CD for NPM Publishing — Codebase Analysis"
workflow: b0.4
date: 2026-03-20
stage: 01-research
role: rdpi-codebase-researcher
---

## Summary

`@fozy-labs/js-configs` is a scoped, public npm package (v0.1.0) that exports shared ESLint, Prettier, TypeScript, and Vitest configurations, plus a CLI tool. The build pipeline compiles TypeScript to `dist/` via `tsc`, tests run on Vitest, and linting uses ESLint + Prettier. There are no existing CI/CD workflows or CI-related config files in the repository.

## Findings

### 1. Build Pipeline

- **Script**: `"build": "rimraf dist && tsc"` — `@/package.json:49`
- **TypeScript compiler** reads `@/tsconfig.json`, which sets `outDir: "./dist"` and `rootDir: "./src"` — `@/tsconfig.json:13-14`
- **Compilation input**: `"include": ["src/**/*"]`, excluding `node_modules`, `dist`, `**/*.test.ts`, `src/__tests__/fixtures/**` — `@/tsconfig.json:17-18`
- **Output**: JavaScript (ESNext modules) + declaration files (`"declaration": true`) placed into `dist/` — `@/tsconfig.json:12`
- **Published files** (`files` field): `["dist", "typescript", "README.md", "LICENSE"]` — `@/package.json:44-48`
  - `dist/` — compiled JS + `.d.ts` files
  - `typescript/` — raw JSON tsconfig files (`tsconfig.base.json`, `tsconfig.test.json`) served as-is without compilation
  - `README.md`, `LICENSE` — documentation

### 2. Test Pipeline

- **Script**: `"test": "vitest run"` — `@/package.json:51`
- **Script (coverage)**: `"test:coverage": "vitest run --coverage"` — `@/package.json:52`
- **Config file**: `@/vitest.config.ts` — uses `vitest/config`'s `defineConfig`
- **Test globals**: enabled (`globals: true`) — `@/vitest.config.ts:5`
- **Test include pattern**: `"src/**/*.test.ts"` — `@/vitest.config.ts:6`
- **Excluded from tests**: `configDefaults.exclude` + `"src/__tests__/fixtures/**"` — `@/vitest.config.ts:7`
- **Coverage provider**: `v8` — `@/vitest.config.ts:9`
- **Coverage include**: `["src/eslint/**", "src/prettier/**", "src/vitest/**", "src/cli/**"]` — `@/vitest.config.ts:10`

**Test files discovered:**

| File | Type | Description |
|---|---|---|
| `@/src/__tests__/integration.test.ts` | Integration | ESLint + Prettier integration tests against fixture files |
| `@/src/__tests__/snapshots.test.ts` | Snapshot | Snapshot tests for all configs and CLI templates |
| `@/src/__tests__/typescript-config.test.ts` | Unit | Validates `typescript/tsconfig.base.json` and `typescript/tsconfig.test.json` structure |
| `@/src/eslint/__tests__/eslint-config.test.ts` | Unit | ESLint config shape, naming, parser options |
| `@/src/prettier/__tests__/prettier-config.test.ts` | Unit | Prettier config values |
| `@/src/vitest/__tests__/vitest-config.test.ts` | Unit | Vitest config shape and values |
| `@/src/cli/__tests__/cli.test.ts` | Unit | CLI `init` command (file/script creation, skip, overwrite) |

**Snapshot files**: `@/src/__tests__/__snapshots__/snapshots.test.ts.snap`

**Test-specific TypeScript config**: `@/tsconfig.test.json` extends `@/tsconfig.json`, adds `"types": ["vitest/globals", "node"]`, sets `"noEmit": true`, includes both test and source files — `@/tsconfig.test.json:1-8`

**ts-check scripts**:
- `"ts-check": "tsc --noEmit"` — checks production code via `@/tsconfig.json` — `@/package.json:50`
- `"ts-check:tests": "tsc --noEmit --project tsconfig.test.json"` — checks test code — `@/package.json:50`

### 3. Lint and Format

- **Lint script**: `"lint": "eslint src/"` — `@/package.json:53`
- **Lint fix script**: `"lint:fix": "eslint src/ --fix"` — `@/package.json:54`
- **Lint config**: `@/eslint.config.ts` — re-exports from `@/src/eslint/index.ts` (`export { default } from "./src/eslint/index"`)
- **ESLint config** includes: `@eslint/js` recommended, `typescript-eslint` strict, Prettier compat (`eslint-config-prettier`), custom rules — `@/src/eslint/index.ts:1-59`
- **ESLint ignores** (in config): `dist/`, `coverage/`, `node_modules/`, `**/*.test.ts`, `**/*.test.tsx`, `src/__tests__/**` — `@/src/eslint/index.ts:10-16`

- **Format check script**: `"format:check": "prettier --check src/"` — `@/package.json:56`
- **Format script**: `"format": "prettier --write src/"` — `@/package.json:55`
- **Prettier config**: `@/src/prettier/index.ts` — `tabWidth: 4`, `printWidth: 120`, import sorting via `@ianvs/prettier-plugin-sort-imports` — `@/src/prettier/index.ts:1-19`

### 4. Package Metadata

- **Name**: `@fozy-labs/js-configs` — `@/package.json:2`
- **Version**: `0.1.0` — `@/package.json:3`
- **Type**: `"module"` (ESM) — `@/package.json:4`
- **License**: `MIT` — `@/package.json:7`
- **Author**: `Vladimir Panev <vova6255@gmail.com>` — `@/package.json:6`
- **Homepage**: `https://github.com/fozy-labs/js-configs` — `@/package.json:8`
- **Repository**: `git+https://github.com/fozy-labs/js-configs.git` — `@/package.json:10`
- **sideEffects**: `false` — `@/package.json:80`

**publishConfig**:
```json
"publishConfig": {
    "access": "public"
}
```
Present at `@/package.json:81-83`. The `access: public` is explicitly set.

**Exports map** (`@/package.json:14-32`):

| Subpath | Import | Types |
|---|---|---|
| `./eslint` | `./dist/eslint/index.js` | `./dist/eslint/index.d.ts` |
| `./prettier` | `./dist/prettier/index.js` | `./dist/prettier/index.d.ts` |
| `./typescript` | `./typescript/tsconfig.base.json` | — |
| `./typescript/test` | `./typescript/tsconfig.test.json` | — |
| `./vitest` | `./dist/vitest/index.js` | `./dist/vitest/index.d.ts` |

**bin entry**: `"js-configs": "./dist/cli/index.js"` — `@/package.json:33-35`

### 5. Dependencies

**dependencies** (`@/package.json:57-62`) — shipped to consumers:

| Package | Version |
|---|---|
| `@eslint/js` | `^9.20.0` |
| `typescript-eslint` | `^8.25.0` |
| `eslint-config-prettier` | `^10.1.0` |
| `@ianvs/prettier-plugin-sort-imports` | `^4.4.0` |

**peerDependencies** (`@/package.json:63-68`):

| Package | Version |
|---|---|
| `eslint` | `^9.0.0` |
| `prettier` | `^3.0.0` |
| `typescript` | `^5.0.0` |
| `vitest` | `^4.0.0` |

**devDependencies** (`@/package.json:69-79`):

| Package | Version |
|---|---|
| `@types/node` | `^22.0.0` |
| `@vitest/coverage-v8` | `^4.0.18` |
| `eslint` | `^9.20.0` |
| `jiti` | `^2.4.0` |
| `jsdom` | `^28.1.0` |
| `prettier` | `^3.5.0` |
| `rimraf` | `6.1.2` |
| `typescript` | `5.9.2` |
| `vitest` | `^4.0.18` |

**engines field**: Does not exist in `@/package.json`. No Node.js version constraint is declared.

### 6. Existing CI Artifacts

| Artifact | Exists? |
|---|---|
| `.github/workflows/` | **No** — directory does not exist |
| `.npmrc` | **No** |
| `.nvmrc` | **No** |
| `.node-version` | **No** |
| `package-lock.json` | **Yes** — `@/package-lock.json` is present |
| `.editorconfig` | **Yes** — `@/.editorconfig` |
| `.gitignore` | **Yes** — `@/.gitignore` |

**`.github/` directory contents**: `agents/`, `copilot-instructions.md`, `instructions/`, `rdpi-stages/`, `skills/` — only Copilot customization files, no workflows.

**`.gitignore` entries** (`@/.gitignore:1-7`):
```
**/node_modules
**/.idea
**/dist
**/*.tsbuildinfo
**/*.obsidian
coverage
.mentall
```
Notable: `dist/` is git-ignored, `coverage` is git-ignored.

### 7. TypeScript Output

- **Compiler options** (`@/tsconfig.json:3-15`):
  - `target: "ESNext"`, `module: "ESNext"` — output is modern ESM
  - `declaration: true` — `.d.ts` files are generated alongside `.js`
  - `outDir: "./dist"`, `rootDir: "./src"`
  - `moduleResolution: "bundler"`
  - `strict: true`, `isolatedModules: true`

- **Output structure** mirrors `src/`:
  - `dist/eslint/index.js` + `dist/eslint/index.d.ts`
  - `dist/prettier/index.js` + `dist/prettier/index.d.ts`
  - `dist/vitest/index.js` + `dist/vitest/index.d.ts`
  - `dist/cli/index.js` + `dist/cli/index.d.ts` (+ cli templates)

- **Test files are excluded** from compilation: `**/*.test.ts` and `src/__tests__/fixtures/**` in exclude — `@/tsconfig.json:18`

- **TypeScript shared configs** (distributed as raw JSON, not compiled):
  - `@/typescript/tsconfig.base.json` — includes `DOM` in lib, `jsx: "react-jsx"`, `noEmitOnError: true`, 13 compilerOptions keys
  - `@/typescript/tsconfig.test.json` — adds `"types": ["vitest/globals"]`, `"noEmit": true`

## Code References

- `@/package.json:2` — package name `@fozy-labs/js-configs`
- `@/package.json:3` — version `0.1.0`
- `@/package.json:4` — `"type": "module"`
- `@/package.json:14-32` — exports map
- `@/package.json:33-35` — bin entry
- `@/package.json:44-48` — files field
- `@/package.json:49` — build script
- `@/package.json:50` — ts-check scripts
- `@/package.json:51-52` — test scripts
- `@/package.json:53-56` — lint and format scripts
- `@/package.json:57-62` — dependencies
- `@/package.json:63-68` — peerDependencies
- `@/package.json:69-79` — devDependencies
- `@/package.json:81-83` — publishConfig with `access: "public"`
- `@/tsconfig.json:1-18` — main TypeScript config
- `@/tsconfig.test.json:1-8` — test TypeScript config
- `@/vitest.config.ts:1-13` — Vitest configuration
- `@/eslint.config.ts:1` — ESLint config (re-export)
- `@/src/eslint/index.ts:1-59` — ESLint shared config
- `@/src/prettier/index.ts:1-19` — Prettier shared config
- `@/src/vitest/index.ts:1-26` — Vitest shared config
- `@/src/cli/index.ts:1-120` — CLI entry point
- `@/typescript/tsconfig.base.json:1-16` — shared base tsconfig
- `@/typescript/tsconfig.test.json:1-6` — shared test tsconfig
- `@/.gitignore:1-7` — gitignore entries
- `@/.editorconfig:1-14` — editorconfig
