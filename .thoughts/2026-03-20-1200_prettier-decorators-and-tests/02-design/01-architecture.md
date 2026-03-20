---
title: "Architecture: Prettier Decorator Support & Test Extension"
date: 2026-03-20
stage: 02-design
role: rdpi-architect
workflow: b0.4
---

# Architecture

## 1. Component Diagram

The change affects one production module and several test/fixture files. The diagram shows the Prettier config module, the import sorting plugin (external dependency), and the test/fixture files that change.

```mermaid
C4Component
    title "Prettier Decorator Support — Component View (C4 Level 3)"

    Container_Boundary(prod, "Production Code") {
        Component(prettierConfig, "src/prettier/index.ts", "Config module", "Exports shared Prettier config object. MODIFIED: adds importOrderParserPlugins.")
        Component_Ext(sortPlugin, "@ianvs/prettier-plugin-sort-imports", "External plugin", "Sorts imports via Babel AST. Reads importOrderParserPlugins for parser config.")
    }

    Container_Boundary(tests, "Test Code") {
        Component(unitTest, "src/prettier/__tests__/prettier-config.test.ts", "Unit test", "MODIFIED: asserts importOrderParserPlugins presence.")
        Component(snapshotTest, "src/__tests__/snapshots.test.ts", "Snapshot test", "UNCHANGED code, but snapshot file updates automatically.")
        Component(integrationTest, "src/__tests__/integration.test.ts", "Integration test", "MODIFIED: adds comprehensive import sorting test, decorator+import sorting test, fixes T23 silent-skip guard.")
    }

    Container_Boundary(fixtures, "Fixture Files") {
        Component(existingFixture, "fixtures/prettier-project/unsorted-imports.ts", "Existing fixture", "UNCHANGED — used by existing T23.")
        Component(newSortFixture, "fixtures/prettier-project/all-groups-imports.ts", "New fixture", "CREATED: imports from all 5 groups in wrong order.")
        Component(newDecoratorFixture, "fixtures/prettier-project/decorator-imports.ts", "New fixture", "CREATED: file with decorators and unsorted imports.")
    }

    Rel(prettierConfig, sortPlugin, "references as plugin")
    Rel(unitTest, prettierConfig, "imports config")
    Rel(snapshotTest, prettierConfig, "snapshots config")
    Rel(integrationTest, prettierConfig, "formats fixtures with config")
    Rel(integrationTest, existingFixture, "reads")
    Rel(integrationTest, newSortFixture, "reads")
    Rel(integrationTest, newDecoratorFixture, "reads")
    Rel(sortPlugin, prettierConfig, "reads importOrderParserPlugins")
```

## 2. Change Inventory

### Production files (modified)

| File | Change |
|------|--------|
| `@/src/prettier/index.ts` | Add `importOrderParserPlugins: ["typescript", "jsx", '["decorators", { "decoratorsBeforeExport": true }]']` to the config object. |

### Test files (modified)

| File | Change |
|------|--------|
| `@/src/prettier/__tests__/prettier-config.test.ts` | Add assertion for `importOrderParserPlugins` presence and content. |
| `@/src/__tests__/integration.test.ts` | Add two new test cases (comprehensive import sorting, decorator+import sorting). Fix T23 silent-skip guard. |
| `@/src/__tests__/__snapshots__/snapshots.test.ts.snap` | Auto-updated by Vitest on next run — new snapshot includes `importOrderParserPlugins` key. |

### Fixture files (created)

| File | Description |
|------|-------------|
| `@/src/__tests__/fixtures/prettier-project/all-groups-imports.ts` | Imports from all 5 configured groups in wrong order. Used by comprehensive import sorting test. |
| `@/src/__tests__/fixtures/prettier-project/decorator-imports.ts` | File with TC39 decorators and unsorted imports. Used by decorator+import sorting test. |

**Total**: 1 production file modified, 2 test files modified, 1 snapshot auto-updated, 2 fixture files created.

## 3. Module Boundaries

- **Production boundary**: Only `src/prettier/index.ts` changes. The exported `Config` type is unchanged — `importOrderParserPlugins` is part of the plugin's option namespace, which Prettier passes through to the plugin. No new dependency is added.
- **Test boundary**: All other changes are test-only. New fixtures are placed in the existing `src/__tests__/fixtures/prettier-project/` directory, following the established convention [ref: [../01-research/01-codebase-analysis.md#9-fixture-files--prettier-project](../01-research/01-codebase-analysis.md#9-fixture-files--prettier-project)].
- **No cross-module impact**: ESLint, Vitest, TypeScript, and CLI configurations are unaffected. The `tsconfig.base.json` is not modified (TC39 stage 3 decorators work in TS 5.0+ without flags) [ref: [../01-research/03-open-questions.md#q6](../01-research/03-open-questions.md#q6)].

## 4. Data Flow: Prettier + Import Sorting Plugin with Decorators

This sequence diagram shows how Prettier processes a file containing both decorators and unsorted imports when `importOrderParserPlugins` includes `"decorators"`.

```mermaid
sequenceDiagram
    title Prettier formatting pipeline with decorator support

    participant Test as Integration Test
    participant Prettier as Prettier Core
    participant TSParser as TypeScript Parser
    participant SortPlugin as @ianvs/prettier-plugin-sort-imports
    participant Babel as Babel Parser (internal to plugin)

    Test->>Prettier: prettier.format(input, { ...config, parser: "typescript" })
    Prettier->>TSParser: Parse source to AST (handles decorators natively)
    TSParser-->>Prettier: TypeScript AST

    Note over Prettier,SortPlugin: Plugin preprocessor runs before formatting

    Prettier->>SortPlugin: preprocess(source, options)
    SortPlugin->>SortPlugin: Read options.importOrderParserPlugins
    Note over SortPlugin: ["typescript", "jsx", ["decorators", { decoratorsBeforeExport: true }]]

    SortPlugin->>Babel: parse(source, { plugins: ["typescript", "jsx", "decorators"] })
    Note over Babel: Decorators plugin enabled — parses @decorator syntax without error
    Babel-->>SortPlugin: Babel AST with import nodes

    SortPlugin->>SortPlugin: Extract imports, classify into groups by importOrder patterns
    SortPlugin->>SortPlugin: Sort groups: BUILTIN → THIRD_PARTY → @/ → ../ → ./
    SortPlugin->>SortPlugin: Insert blank-line separators between groups
    SortPlugin->>SortPlugin: Reconstruct source with sorted imports, preserve non-import code

    SortPlugin-->>Prettier: Preprocessed source (sorted imports, decorators intact)

    Prettier->>Prettier: Format preprocessed source (indentation, line width, etc.)
    Prettier-->>Test: Formatted output
```

**Key insight**: Without `importOrderParserPlugins` including `"decorators"`, the Babel parse step (inside the sort plugin) throws `SyntaxError` on decorator syntax — even though Prettier's own TypeScript parser handles decorators fine. The config change fixes only the plugin's internal Babel parse [ref: [../01-research/02-external-research.md#2-import-sorting-plugins-use-babel-internally](../01-research/02-external-research.md#2-import-sorting-plugins-use-babel-internally)].
