import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        include: ["src/**/*.test.ts"],
        exclude: [...configDefaults.exclude, "src/__tests__/fixtures/**"],
        coverage: {
            provider: "v8",
            include: ["src/eslint/**", "src/prettier/**", "src/vitest/**", "src/cli/**"],
        },
    },
});
