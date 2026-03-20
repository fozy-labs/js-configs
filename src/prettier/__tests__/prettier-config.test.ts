import config from "../index.js";

describe("Prettier shared config", () => {
    // T6: Config shape
    it("exports correct config values", () => {
        expect(config.tabWidth).toBe(4);
        expect(config.printWidth).toBe(120);
        expect(config.plugins).toContain("@ianvs/prettier-plugin-sort-imports");
        expect(config.importOrder).toHaveLength(9);
        expect(config.importOrderParserPlugins).toBeDefined();
        expect(config.importOrderParserPlugins).toContain("typescript");
        expect(config.importOrderParserPlugins).toContain("jsx");
        expect(config.importOrderParserPlugins).toHaveLength(3);
    });
});
