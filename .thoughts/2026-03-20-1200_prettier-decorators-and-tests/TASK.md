---
workflow: b0.4
---

# Task: Add Decorator Support in Prettier and Extend Tests

## Objective

1. **Add decorator support (ECMA stage 3)** to the Prettier configuration so that decorators are properly formatted.
2. **Extend tests** — specifically for import sorting cases with various import path patterns:
   - `@external` (external packages)
   - `@/shared` (aliased internal paths)
   - `../../../relative` (deep relative imports)
   - `../../another` (relative imports)
   - `./local` (local imports)
3. **Fix all currently failing tests** — the user reports that tests are currently failing. Investigate and fix all broken aspects of the application.

## Scope

- Prettier configuration (`src/prettier/`)
- Test suites across the project
- Any related configuration that affects decorator parsing or import sorting
