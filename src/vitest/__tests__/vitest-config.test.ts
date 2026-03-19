import config from "../index.js";

describe("Vitest shared config", () => {
    // T7: Plain object with test key
    it("exports a plain object with test key", () => {
        expect(typeof config).toBe("object");
        expect(config).not.toBeNull();
        expect("test" in config).toBe(true);
        expect(typeof config.test).toBe("object");
    });

    // T8: Core test settings
    it("has correct core test settings", () => {
        expect(config.test.globals).toBe(true);
        expect(config.test.environment).toBe("jsdom");
        expect(config.test.pool).toBe("forks");
        expect(config.test.coverage.provider).toBe("v8");
        expect(config.test.coverage.thresholds.statements).toBe(80);
        expect(config.test.coverage.thresholds.branches).toBe(80);
        expect(config.test.coverage.thresholds.functions).toBe(80);
        expect(config.test.coverage.thresholds.lines).toBe(80);
    });

    // T9: No resolve.alias (ADR-5)
    it("does not contain resolve.alias", () => {
        expect("resolve" in config).toBe(false);
    });

    // T10: No coverage.include (ADR-2)
    it("does not contain coverage.include", () => {
        expect("include" in config.test.coverage).toBe(false);
    });
});
