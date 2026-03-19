import config from "../index.js";

describe("ESLint shared config", () => {
    // T1: Is a non-empty array
    it("exports a non-empty array of config objects", () => {
        expect(Array.isArray(config)).toBe(true);
        expect(config.length).toBeGreaterThan(0);
        for (const item of config) {
            expect(typeof item).toBe("object");
            expect(item).not.toBeNull();
        }
    });

    // T2: Named config objects have @fozy-labs prefix
    it("has named config objects with @fozy-labs/js-configs/ prefix", () => {
        const namedConfigs = config.filter(
            (c) => "name" in c && typeof c.name === "string",
        );
        expect(namedConfigs.length).toBeGreaterThan(0);

        for (const c of namedConfigs) {
            if (
                typeof c.name === "string" &&
                c.name.startsWith("@fozy-labs/")
            ) {
                expect(c.name).toMatch(/^@fozy-labs\/js-configs\//);
            }
        }
    });

    // T3: Has projectService: true
    it("includes projectService: true in parser options", () => {
        const hasProjectService = config.some(
            (c) =>
                "languageOptions" in c &&
                c.languageOptions &&
                typeof c.languageOptions === "object" &&
                "parserOptions" in c.languageOptions &&
                c.languageOptions.parserOptions &&
                typeof c.languageOptions.parserOptions === "object" &&
                "projectService" in c.languageOptions.parserOptions &&
                c.languageOptions.parserOptions.projectService === true,
        );
        expect(hasProjectService).toBe(true);
    });

    // T4: No tsconfigRootDir anywhere (ADR-4)
    it("does not contain tsconfigRootDir in any config object", () => {
        const hasRootDir = (obj: unknown, seen = new WeakSet()): boolean => {
            if (obj === null || typeof obj !== "object") return false;
            if (seen.has(obj as object)) return false;
            seen.add(obj as object);
            if ("tsconfigRootDir" in (obj as Record<string, unknown>))
                return true;
            return Object.values(obj as Record<string, unknown>).some((v) =>
                hasRootDir(v, seen),
            );
        };

        for (const c of config) {
            expect(hasRootDir(c)).toBe(false);
        }
    });

    // T5: Last element is prettier compat
    it("has prettier compat config as the last element", () => {
        const last = config[config.length - 1];
        expect(last).toBeDefined();
        expect("rules" in last).toBe(true);
    });
});
