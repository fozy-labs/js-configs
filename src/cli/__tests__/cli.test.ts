import {
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { init } from "../index.js";

import { editorconfigTemplate } from "../templates/editorconfig.js";
import { gitignoreTemplate } from "../templates/gitignore.js";
import { prettierignoreTemplate } from "../templates/prettierignore.js";

describe("CLI init", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = join(
            tmpdir(),
            `js-configs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        );
        mkdirSync(tempDir, { recursive: true });
        // Create a minimal package.json for script injection
        writeFileSync(
            join(tempDir, "package.json"),
            JSON.stringify({ name: "test-project", scripts: {} }, null, 4),
        );
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    // T29: Fresh init creates all 3 dot files
    it("creates all dot files in empty directory", () => {
        init(tempDir, false);

        expect(readFileSync(join(tempDir, ".editorconfig"), "utf-8")).toBe(
            editorconfigTemplate,
        );
        expect(readFileSync(join(tempDir, ".gitignore"), "utf-8")).toBe(
            gitignoreTemplate,
        );
        expect(readFileSync(join(tempDir, ".prettierignore"), "utf-8")).toBe(
            prettierignoreTemplate,
        );
    });

    // T30: Existing file not overwritten without --force
    it("skips existing files without --force", () => {
        const customContent = "# custom gitignore\n";
        writeFileSync(join(tempDir, ".gitignore"), customContent);

        init(tempDir, false);

        expect(readFileSync(join(tempDir, ".gitignore"), "utf-8")).toBe(
            customContent,
        );
        expect(existsSync(join(tempDir, ".editorconfig"))).toBe(true);
        expect(existsSync(join(tempDir, ".prettierignore"))).toBe(true);
    });

    // T31: --force overwrites existing files
    it("overwrites existing files with --force", () => {
        writeFileSync(join(tempDir, ".gitignore"), "# custom\n");

        init(tempDir, true);

        expect(readFileSync(join(tempDir, ".gitignore"), "utf-8")).toBe(
            gitignoreTemplate,
        );
    });

    // T32: Summary counts
    it("handles mixed create/skip scenarios correctly", () => {
        writeFileSync(join(tempDir, ".editorconfig"), "# existing\n");

        init(tempDir, false);

        // .editorconfig should be unchanged (skipped)
        expect(readFileSync(join(tempDir, ".editorconfig"), "utf-8")).toBe(
            "# existing\n",
        );
        // .gitignore and .prettierignore should be created
        expect(readFileSync(join(tempDir, ".gitignore"), "utf-8")).toBe(
            gitignoreTemplate,
        );
        expect(readFileSync(join(tempDir, ".prettierignore"), "utf-8")).toBe(
            prettierignoreTemplate,
        );
    });
});
