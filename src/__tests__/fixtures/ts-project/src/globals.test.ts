// Uses vitest globals without imports — requires tsconfig.test.json with types: ["vitest/globals"]
describe("example", () => {
    it("works", () => {
        expect(true).toBe(true);
    });
});
