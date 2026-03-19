const config = {
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["src/__tests__/setup.ts"],
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        coverage: {
            provider: "v8",
            exclude: [
                "src/**/*.test.ts",
                "src/**/*.test.tsx",
                "src/**/index.ts",
                "src/**/*.types.ts",
            ],
            thresholds: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80,
            },
        },
        pool: "forks",
    },
} as const;

export default config;
