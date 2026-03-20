---
title: "Use Cases: Prettier Decorator Support & Test Extension"
date: 2026-03-20
stage: 02-design
role: rdpi-architect
workflow: b0.4
---

# Use Cases

## UC-1: Config Usage with Decorators

A TypeScript file with TC39 stage 3 decorators and unsorted imports. Before the config change, `prettier.format()` with the import sorting plugin throws `SyntaxError` on this file. After adding `importOrderParserPlugins`, formatting succeeds.

### Input (unformatted, unsorted)

```typescript
// @ts-ignore
import { Logger } from "@/utils/logger";
import { readFileSync } from "node:fs";
// @ts-ignore
import express from "express";

// @ts-ignore
function log(_target: any, _key: string, descriptor: PropertyDescriptor) {
    return descriptor;
}

class UserService {
    @log
    getUser() {
        return { name: "Alice" };
    }
}

export { UserService };
```

### Expected output (formatted, sorted)

```typescript
import { readFileSync } from "node:fs";

// @ts-ignore
import express from "express";

// @ts-ignore
import { Logger } from "@/utils/logger";

// @ts-ignore
function log(_target: any, _key: string, descriptor: PropertyDescriptor) {
    return descriptor;
}

class UserService {
    @log
    getUser() {
        return { name: "Alice" };
    }
}

export { UserService };
```

**Key observations**:
- `node:fs` (builtin) moves to the top — no `@ts-ignore` needed since it's a real module.
- `express` (third-party) comes second, separated by a blank line.
- `@/utils/logger` (alias) comes third, separated by a blank line.
- `@ts-ignore` comments move with their associated imports.
- Decorator `@log` and the decorated method are preserved unchanged.
- The import sorting plugin no longer throws `SyntaxError` because `importOrderParserPlugins` includes `"decorators"`.

---

## UC-2: Import Sorting with All 5 Groups

A fixture file with imports from all 5 configured groups in intentionally wrong order, testing the full `importOrder` configuration.

### Input (all groups, wrong order)

```typescript
// @ts-ignore
import { helper } from "./helper";
// @ts-ignore
import { api } from "@/services/api";
import { readFileSync } from "node:fs";
// @ts-ignore
import { parent } from "../parent";
// @ts-ignore
import express from "express";
// @ts-ignore
import { config } from "../../config";

// @ts-ignore
export { helper, api, readFileSync, parent, express, config };
```

### Expected output (sorted with blank-line separators)

```typescript
import { readFileSync } from "node:fs";

// @ts-ignore
import express from "express";

// @ts-ignore
import { api } from "@/services/api";

// @ts-ignore
import { config } from "../../config";
// @ts-ignore
import { parent } from "../parent";

// @ts-ignore
import { helper } from "./helper";

// @ts-ignore
export { helper, api, readFileSync, parent, express, config };
```

**Group ordering verified**:
1. **Builtin** (`node:fs`) — `<BUILTIN_MODULES>` pattern
2. *(blank line)*
3. **Third-party** (`express`) — `<THIRD_PARTY_MODULES>` pattern
4. *(blank line)*
5. **Alias** (`@/services/api`) — `^@/(.*)$` pattern
6. *(blank line)*
7. **Relative parent** (`../../config`, `../parent`) — `^\\.\\.(.*)` pattern. Multiple relative imports within the same group are sorted alphabetically, no blank line between them.
8. *(blank line)*
9. **Local** (`./helper`) — `^\\./(.*)$` pattern

---

## UC-3: Edge Cases

### EC-1: File with only decorators, no unsorted imports

```typescript
function sealed(_constructor: Function) {}

@sealed
class BugReport {
    title: string;

    constructor(t: string) {
        this.title = t;
    }
}

export { BugReport };
```

**Expected behavior**: Prettier formats the file normally. The import sorting plugin finds no imports to sort and returns the source unchanged. `importOrderParserPlugins` with `"decorators"` ensures the plugin's Babel parser doesn't throw on the `@sealed` syntax. Output matches standard Prettier formatting.

### EC-2: File with only imports, no decorators

```typescript
// @ts-ignore
import { helper } from "./helper";
import { readFileSync } from "node:fs";
// @ts-ignore
import express from "express";

export { helper, readFileSync, express };
```

**Expected behavior**: Identical to current behavior — imports sorted by group, blank-line separators inserted. The `"decorators"` entry in `importOrderParserPlugins` has no effect on files without decorators (Babel simply doesn't encounter decorator syntax).

### EC-3: Side-effect imports mixed in

```typescript
import "reflect-metadata";
// @ts-ignore
import { helper } from "./helper";
import { readFileSync } from "node:fs";
// @ts-ignore
import express from "express";

export { helper, readFileSync, express };
```

**Expected behavior**: `@ianvs/prettier-plugin-sort-imports` treats side-effect imports (`import "reflect-metadata"`) as barriers — they are not moved, and other imports cannot cross them [ref: [../01-research/02-external-research.md#3-ianvsprettier-plugin-sort-imports-key-advantages-over-trivago](../01-research/02-external-research.md#3-side-effect-imports-can-be-silently-reordered)]. The side-effect import stays at its position; only the non-side-effect imports below it are sorted.

### EC-4: Empty import groups

```typescript
import { readFileSync } from "node:fs";
// @ts-ignore
import express from "express";

export { readFileSync, express };
```

**Expected behavior**: Only builtin and third-party groups have imports. The alias (`@/`), relative parent (`../`), and local (`./`) groups are empty. The plugin outputs only the two present groups with a blank-line separator between them. Empty groups produce no output and no extra blank lines.
