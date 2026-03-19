import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("TypeScript shared configs", () => {
    const basePath = resolve(process.cwd(), "typescript/tsconfig.base.json");
    const testPath = resolve(process.cwd(), "typescript/tsconfig.test.json");

    // T11: Base config has exactly 13 compilerOptions
    it("tsconfig.base.json has exactly 13 compilerOptions keys", () => {
        const content = JSON.parse(readFileSync(basePath, "utf-8"));
        const keys = Object.keys(content.compilerOptions);
        expect(keys).toHaveLength(13);
        expect(keys).toEqual(
            expect.arrayContaining([
                "target",
                "module",
                "lib",
                "strict",
                "esModuleInterop",
                "skipLibCheck",
                "forceConsistentCasingInFileNames",
                "moduleResolution",
                "resolveJsonModule",
                "isolatedModules",
                "noEmitOnError",
                "declaration",
                "jsx",
            ]),
        );
    });

    // T12: Base config excludes path-sensitive options (ADR-3)
    it("tsconfig.base.json does not contain paths, baseUrl, outDir, include, exclude", () => {
        const content = JSON.parse(readFileSync(basePath, "utf-8"));
        expect(content.compilerOptions.paths).toBeUndefined();
        expect(content.compilerOptions.baseUrl).toBeUndefined();
        expect(content.compilerOptions.outDir).toBeUndefined();
        expect(content.include).toBeUndefined();
        expect(content.exclude).toBeUndefined();
    });

    // T13: Test config has vitest globals and noEmit
    it("tsconfig.test.json has types and noEmit", () => {
        const content = JSON.parse(readFileSync(testPath, "utf-8"));
        expect(content.compilerOptions.types).toContain("vitest/globals");
        expect(content.compilerOptions.noEmit).toBe(true);
    });

    // T14: Test config has no extends
    it("tsconfig.test.json does not have extends key", () => {
        const content = JSON.parse(readFileSync(testPath, "utf-8"));
        expect(content.extends).toBeUndefined();
    });
});
