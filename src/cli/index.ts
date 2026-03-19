#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { editorconfigTemplate } from "./templates/editorconfig.js";
import { gitignoreTemplate } from "./templates/gitignore.js";
import { prettierignoreTemplate } from "./templates/prettierignore.js";

interface FileResult {
    file: string;
    status: "created" | "skipped" | "overwritten";
}

interface ScriptResult {
    script: string;
    status: "added" | "skipped" | "overwritten";
}

const TEMPLATES: Array<{ filename: string; content: string }> = [
    { filename: ".editorconfig", content: editorconfigTemplate },
    { filename: ".gitignore", content: gitignoreTemplate },
    { filename: ".prettierignore", content: prettierignoreTemplate },
];

const SCRIPTS: Record<string, string> = {
    build: "rimraf ./dist && tsc && tsc-alias",
    "build:watch": 'npm run build && (concurrently "tsc -w" "tsc-alias -w")',
    "ts-check": "tsc --noEmit",
    test: "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    lint: "eslint src/",
    "lint:fix": "eslint src/ --fix",
    format: "prettier --write src/",
    "format:check": "prettier --check src/",
};

export function init(targetDir: string, force: boolean): void {
    const fileResults: FileResult[] = [];
    const scriptResults: ScriptResult[] = [];

    // Write dot files
    for (const template of TEMPLATES) {
        const filePath = join(targetDir, template.filename);
        const exists = existsSync(filePath);

        if (exists && !force) {
            console.log(`  ⏭  ${template.filename} (exists, skipped)`);
            fileResults.push({ file: template.filename, status: "skipped" });
        } else {
            writeFileSync(filePath, template.content, "utf-8");
            const status = exists ? "overwritten" : "created";
            const icon = exists ? "🔄" : "✅";
            console.log(`  ${icon}  ${template.filename} (${status})`);
            fileResults.push({ file: template.filename, status });
        }
    }

    // Add npm scripts
    const pkgPath = join(targetDir, "package.json");
    if (existsSync(pkgPath)) {
        const pkgContent = readFileSync(pkgPath, "utf-8");
        const pkg = JSON.parse(pkgContent) as Record<string, unknown>;
        const existingScripts = (pkg.scripts ?? {}) as Record<string, string>;

        for (const [name, value] of Object.entries(SCRIPTS)) {
            const exists = name in existingScripts;

            if (exists && !force) {
                scriptResults.push({ script: name, status: "skipped" });
            } else {
                existingScripts[name] = value;
                const status = exists ? "overwritten" : "added";
                scriptResults.push({ script: name, status });
            }
        }

        pkg.scripts = existingScripts;
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n", "utf-8");

        const added = scriptResults.filter((r) => r.status === "added").length;
        const skippedScripts = scriptResults.filter(
            (r) => r.status === "skipped",
        ).length;
        const overwritten = scriptResults.filter(
            (r) => r.status === "overwritten",
        ).length;

        if (added > 0 || overwritten > 0) {
            console.log(
                `\n  📦 package.json scripts: ${added} added, ${skippedScripts} skipped, ${overwritten} overwritten`,
            );
        }
    }

    // Summary
    const created = fileResults.filter((r) => r.status === "created").length;
    const skipped = fileResults.filter((r) => r.status === "skipped").length;
    const overwrittenFiles = fileResults.filter(
        (r) => r.status === "overwritten",
    ).length;

    console.log(
        `\n  Done! Files: ${created} created, ${skipped} skipped, ${overwrittenFiles} overwritten.`,
    );
}

// CLI entry point
const args = process.argv.slice(2);
const command = args[0];

if (command === "init") {
    const force = args.includes("--force");
    const targetDir = process.cwd();
    console.log(`\n  @fozy-labs/js-configs init${force ? " --force" : ""}\n`);
    init(targetDir, force);
} else {
    console.log("Usage: js-configs init [--force]");
    console.log("\nCommands:");
    console.log(
        "  init       Generate .editorconfig, .gitignore, .prettierignore and npm scripts",
    );
    console.log("\nOptions:");
    console.log("  --force    Overwrite existing files and scripts");
}
