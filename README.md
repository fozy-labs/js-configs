# @fozy-labs/js-configs

Shared ESLint, Prettier, TypeScript, Vitest, and EditorConfig configurations for fozy-labs packages.

<!-- badges -->

## Quick Start

```bash
npm install -D @fozy-labs/js-configs eslint prettier typescript vitest @vitest/coverage-v8 jsdom jiti
```

```ts
// eslint.config.ts
import sharedConfig from "@fozy-labs/js-configs/eslint";
export default [...sharedConfig, { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } }];
```

```jsonc
// package.json — zero-config Prettier
{ "prettier": "@fozy-labs/js-configs/prettier" }
```

```jsonc
// tsconfig.json
{ "extends": "@fozy-labs/js-configs/typescript", "compilerOptions": { "outDir": "./dist" }, "include": ["src/**/*"] }
```

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from "vitest/config";
import sharedConfig from "@fozy-labs/js-configs/vitest";
export default mergeConfig(sharedConfig, defineConfig({ test: { coverage: { include: ["src/**"] } } }));
```

```bash
npx js-configs init          # generates .editorconfig, .gitignore, .prettierignore + npm scripts
```

## ESLint

Import the shared config and spread it into your flat config array. The shared config exports a plain `Linter.Config[]` array (ADR-1), so it works with any wrapper — `tseslint.config()`, `defineConfig()`, or raw array.

**What's included:**

- Global ignores: `dist/`, `coverage/`, `node_modules/`, `**/*.test.ts`, `**/*.test.tsx`, `src/__tests__/**`
- `@eslint/js` recommended rules
- `typescript-eslint` strict rules
- 6 custom rule overrides (`no-explicit-any` off, `no-non-null-assertion` off, `no-extraneous-class` off, `no-dynamic-delete` off, `no-invalid-void-type` off, `no-unused-vars` with `^_` ignore patterns)
- `projectService: true` for typed linting
- `eslint-config-prettier` compatibility layer

**Consumer must add** `tsconfigRootDir: import.meta.dirname` (ADR-4):

```ts
// eslint.config.ts
import sharedConfig from "@fozy-labs/js-configs/eslint";

export default [
  ...sharedConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Optional: project-specific ignores
  { ignores: ["apps/"] },
];
```

## Prettier

**What's included:**

- `tabWidth: 4`
- `printWidth: 120`
- Import sorting via `@ianvs/prettier-plugin-sort-imports` with grouped import order (builtins → third-party → `@/` alias → relative)

### Zero-config (recommended)

Add to `package.json`:

```json
{
  "prettier": "@fozy-labs/js-configs/prettier"
}
```

### Import + override

```js
// prettier.config.mjs
import sharedConfig from "@fozy-labs/js-configs/prettier";

export default {
  ...sharedConfig,
};
```

## TypeScript

**What's included** (13 `compilerOptions`):

`target: ESNext`, `module: ESNext`, `lib: [DOM, ESNext]`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`, `moduleResolution: bundler`, `resolveJsonModule: true`, `isolatedModules: true`, `noEmitOnError: true`, `declaration: true`, `jsx: react-jsx`

**Consumer must add**: `outDir`, `baseUrl`, `paths`, `include`, `exclude` — these are path-relative fields excluded by design (ADR-3).

### tsconfig.json

```jsonc
{
  "extends": "@fozy-labs/js-configs/typescript",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx", "src/__tests__/**"]
}
```

### tsconfig.test.json

The shared test config adds `types: ["vitest/globals"]` and `noEmit: true`. Use array `extends` (requires TypeScript ≥ 5.0) to chain the local tsconfig with the shared test overlay:

```jsonc
{
  "extends": ["./tsconfig.json", "@fozy-labs/js-configs/typescript/test"],
  "include": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/__tests__/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Vitest

Uses `mergeConfig` for deep merge composition — Vitest has no native `extends` mechanism.

**What's included:**

- `globals: true`
- `environment: "jsdom"`
- `setupFiles: ["src/__tests__/setup.ts"]`
- `test.include`: `["src/**/*.test.ts", "src/**/*.test.tsx"]`
- `coverage.provider: "v8"` with 80% thresholds (statements, branches, functions, lines)
- `coverage.exclude`: test files, index files, type files
- `pool: "forks"`

**Consumer must add**: `resolve.alias` (ADR-5) and `coverage.include` (ADR-2).

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import sharedConfig from "@fozy-labs/js-configs/vitest";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      coverage: {
        include: ["src/**"],
      },
    },
  }),
);
```

## CLI

```bash
npx js-configs init [--force]
```

Generates dot files from canonical templates and scaffolds npm scripts in `package.json`.

**Files generated:**

| File | Contents |
|------|----------|
| `.editorconfig` | `indent_style: space`, `indent_size: 4`, LF, UTF-8, special rules for `*.md` and `*.{json,yml,yaml}` |
| `.gitignore` | `node_modules`, `.idea`, `dist`, `*.tsbuildinfo`, `*.obsidian`, `coverage` |
| `.prettierignore` | `dist/`, `coverage/`, `node_modules/`, `*.md` |

**Scripts scaffolded:** `build`, `build:watch`, `ts-check`, `test`, `test:watch`, `test:coverage`, `lint`, `lint:fix`, `format`, `format:check`

Use `--force` to overwrite existing files and scripts.

## Override Examples

### Add ESLint rules

```ts
export default [
  ...sharedConfig,
  {
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      // Re-enable a rule turned off by shared config
      "@typescript-eslint/no-explicit-any": "error",
      // Add a project-specific rule
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
];
```

### Change Vitest coverage thresholds

```ts
export default mergeConfig(
  sharedConfig,
  defineConfig({
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
      coverage: {
        include: ["src/lib/**", "src/utils/**"],
        thresholds: {
          branches: 70, // overrides shared 80; other thresholds remain at 80
        },
      },
    },
  }),
);
```

### Add tsconfig paths

```jsonc
{
  "extends": "@fozy-labs/js-configs/typescript",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
      "@components/*": ["src/components/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx", "src/__tests__/**"]
}
```

### Override Prettier option

```js
import sharedConfig from "@fozy-labs/js-configs/prettier";

export default {
  ...sharedConfig,
  printWidth: 100,
  singleQuote: true,
};
```

## What's NOT in the Shared Config

These values are intentionally excluded. Including them would cause silent failures due to path resolution from inside `node_modules`.

| Setting | Reason | Reference |
|---------|--------|-----------|
| `tsconfigRootDir` | `import.meta.dirname` resolves to the package's directory inside `node_modules`, not the consumer's project root | ADR-4 |
| `resolve.alias` | Vitest/Vite resolves alias paths relative to the config file location — would resolve to `node_modules/@fozy-labs/js-configs/src/` | ADR-5 |
| `coverage.include` | Entirely project-specific (`src/common/**` vs `src/core/**`) — no shared default is meaningful | ADR-2 |
| `paths` / `baseUrl` / `outDir` | TypeScript resolves these relative to the tsconfig file — would resolve incorrectly from `node_modules` | ADR-3 |
| `include` / `exclude` | TypeScript `extends` **overwrites** (not merges) these arrays — consumer values would silently disappear | ADR-3 |

## Consumer-Side Dependencies

These packages must be installed by the consumer — they are not bundled with or transitively provided by `@fozy-labs/js-configs`:

| Package | Purpose |
|---------|---------|
| `@vitest/coverage-v8` | V8 coverage provider for Vitest |
| `jsdom` | DOM environment for Vitest tests |
| `jiti` | TypeScript config file loader (required for `eslint.config.ts`) |

Install alongside:

```bash
npm install -D @vitest/coverage-v8 jsdom jiti
```

## Semver Policy

| Change type | Semver bump |
|-------------|-------------|
| Add new lint rule (any severity) | **minor** |
| Change existing rule severity or options | **major** |
| Remove rule | **major** |
| Change Prettier option value | **major** |
| Change tsconfig `compilerOptions` | **major** |
| Bump minimum peerDependency version | **major** |
| Add new config name/metadata | **patch** |
| Fix incorrect rule configuration | **patch** |
| Update CLI templates | **minor** |

## License

MIT
