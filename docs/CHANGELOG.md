# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Shared ESLint flat config (`@fozy-labs/js-configs/eslint`) — `@eslint/js` recommended, `typescript-eslint` strict, 6 custom rule overrides (`no-explicit-any` off, `no-non-null-assertion` off, `no-extraneous-class` off, `no-dynamic-delete` off, `no-invalid-void-type` off, `no-unused-vars` with `^_` patterns), `projectService: true`, `eslint-config-prettier`
- Shared Prettier config (`@fozy-labs/js-configs/prettier`) — `tabWidth: 4`, `printWidth: 120`, import sorting via `@ianvs/prettier-plugin-sort-imports` (builtins → third-party → `@/` alias → relative)
- Shared TypeScript base config (`@fozy-labs/js-configs/typescript`) — 13 `compilerOptions`: `target: ESNext`, `module: ESNext`, `lib: [DOM, ESNext]`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`, `moduleResolution: bundler`, `resolveJsonModule: true`, `isolatedModules: true`, `noEmitOnError: true`, `declaration: true`, `jsx: react-jsx`
- Shared TypeScript test config (`@fozy-labs/js-configs/typescript/test`) — `types: ["vitest/globals"]`, `noEmit: true`
- Shared Vitest config (`@fozy-labs/js-configs/vitest`) — `globals: true`, `environment: "jsdom"`, `setupFiles: ["src/__tests__/setup.ts"]`, `test.include` for `.test.ts`/`.test.tsx`, `coverage.provider: "v8"` with 80% thresholds, `coverage.exclude` for test/index/type files, `pool: "forks"`
- CLI tool (`js-configs init [--force]`) — generates `.editorconfig`, `.gitignore`, `.prettierignore` from canonical templates; scaffolds 10 npm scripts (`build`, `build:watch`, `ts-check`, `test`, `test:watch`, `test:coverage`, `lint`, `lint:fix`, `format`, `format:check`)
- Migration guide (`MIGRATION.md`) — step-by-step migration for ESLint, Prettier, TypeScript, Vitest, CLI with before/after diffs and path resolution warnings

### Design Decisions
- ESLint config exported as plain `Linter.Config[]` array (ADR-1)
- `coverage.include` excluded — consumer-specific (ADR-2)
- `include`/`exclude` excluded from tsconfigs — overwrite semantics (ADR-3)
- `tsconfigRootDir` excluded from ESLint config — consumer-side (ADR-4)
- `resolve.alias` excluded from Vitest config — path resolution (ADR-5)
- `.tsx` patterns included unconditionally (ADR-6)
- Tiered semver: additions=minor, changes/removals=major (ADR-7)
- Peer dependency ranges: `^major.0.0` (ADR-8)
