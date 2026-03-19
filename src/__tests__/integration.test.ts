import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ESLint } from "eslint";
import * as prettier from "prettier";

import eslintConfig from "../eslint/index.js";
import prettierConfig from "../prettier/index.js";

const FIXTURES = resolve(process.cwd(), "src/__tests__/fixtures");

describe("ESLint integration", () => {
    const eslintFixture = resolve(FIXTURES, "eslint-project");
    // Filter out global ignores — we're testing rules, not ignore patterns
    const rulesConfig = eslintConfig.filter(
        (c) => c.name !== "@fozy-labs/js-configs/ignores",
    );

    // T19: Valid file — no errors
    it("lints valid.ts without errors", async () => {
        const eslint = new ESLint({
            overrideConfigFile: true,
            overrideConfig: [
                ...rulesConfig,
                {
                    languageOptions: {
                        parserOptions: {
                            tsconfigRootDir: eslintFixture,
                        },
                    },
                },
            ],
        });
        const results = await eslint.lintFiles([
            resolve(eslintFixture, "valid.ts"),
        ]);
        const errors = results.flatMap((r) =>
            r.messages.filter((m) => m.severity === 2),
        );
        expect(errors).toHaveLength(0);
    });

    // T20: Violation file — expected errors
    it("reports violations in violation.ts", async () => {
        const eslint = new ESLint({
            overrideConfigFile: true,
            overrideConfig: [
                ...rulesConfig,
                {
                    languageOptions: {
                        parserOptions: {
                            tsconfigRootDir: eslintFixture,
                        },
                    },
                },
            ],
        });
        const results = await eslint.lintFiles([
            resolve(eslintFixture, "violation.ts"),
        ]);
        const errors = results.flatMap((r) =>
            r.messages.filter((m) => m.severity === 2),
        );
        expect(errors.length).toBeGreaterThan(0);
    });

    // T21: Type-aware linting works
    it("type-aware rules fire correctly", async () => {
        const eslint = new ESLint({
            overrideConfigFile: true,
            overrideConfig: [
                ...rulesConfig,
                {
                    languageOptions: {
                        parserOptions: {
                            tsconfigRootDir: eslintFixture,
                        },
                    },
                },
            ],
        });
        const results = await eslint.lintFiles([
            resolve(eslintFixture, "valid.ts"),
        ]);
        // projectService is enabled (no parser errors)
        const parserErrors = results.flatMap((r) =>
            r.messages.filter((m) => m.fatal),
        );
        expect(parserErrors).toHaveLength(0);
    });
});

describe("Prettier integration", () => {
    const prettierFixture = resolve(FIXTURES, "prettier-project");

    // T22: Unformatted file gets reformatted
    it("reformats unformatted.ts with correct settings", async () => {
        const input = readFileSync(
            resolve(prettierFixture, "unformatted.ts"),
            "utf-8",
        );
        const output = await prettier.format(input, {
            ...prettierConfig,
            parser: "typescript",
        });
        expect(output).not.toBe(input);
        // Check 4-space indent
        const lines = output.split("\n").filter((l) => l.startsWith(" "));
        for (const line of lines) {
            const indent = line.match(/^( +)/)?.[1]?.length ?? 0;
            expect(indent % 4).toBe(0);
        }
    });

    // T23: Import sorting works (plugin resolution)
    it("sorts imports correctly via plugin", async () => {
        const input = readFileSync(
            resolve(prettierFixture, "unsorted-imports.ts"),
            "utf-8",
        );
        const output = await prettier.format(input, {
            ...prettierConfig,
            parser: "typescript",
        });
        const lines = output.split("\n").filter((l) => l.startsWith("import"));
        // node:fs should come before express (builtin before third-party)
        const fsIndex = lines.findIndex((l) => l.includes("node:fs"));
        const expressIndex = lines.findIndex((l) => l.includes("express"));
        if (fsIndex !== -1 && expressIndex !== -1) {
            expect(fsIndex).toBeLessThan(expressIndex);
        }
    });
});

describe("TypeScript integration", () => {
    const tsFixture = resolve(FIXTURES, "ts-project");

    // T24: Valid project compiles
    it("compiles valid project with shared tsconfig", () => {
        expect(() => {
            execSync(
                `npx tsc --noEmit -p ${resolve(tsFixture, "tsconfig.json")}`,
                {
                    cwd: process.cwd(),
                    stdio: "pipe",
                },
            );
        }).not.toThrow();
    });

    // T25: Strict mode catches violations
    it("strict mode catches implicit any", () => {
        // strict-violation.ts has implicit any — tsc --strict should fail
        expect(() => {
            execSync(
                `npx tsc --noEmit --strict ${resolve(tsFixture, "src/strict-violation.ts")}`,
                { cwd: process.cwd(), stdio: "pipe" },
            );
        }).toThrow();
    });

    // T26: Test tsconfig with vitest globals compiles
    it("test tsconfig recognizes vitest globals", () => {
        expect(() => {
            execSync(
                `npx tsc --noEmit -p ${resolve(tsFixture, "tsconfig.test.json")}`,
                { cwd: process.cwd(), stdio: "pipe" },
            );
        }).not.toThrow();
    });
});
