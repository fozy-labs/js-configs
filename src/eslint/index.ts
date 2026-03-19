import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

import type { Linter } from "eslint";

const config: Linter.Config[] = [
    {
        name: "@fozy-labs/js-configs/ignores",
        ignores: [
            "dist/",
            "coverage/",
            "node_modules/",
            "**/*.test.ts",
            "**/*.test.tsx",
            "src/__tests__/**",
        ],
    },

    js.configs.recommended,

    ...tseslint.configs.strict,

    {
        name: "@fozy-labs/js-configs/parser",
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
    },

    {
        name: "@fozy-labs/js-configs/rules",
        files: ["src/**/*.ts", "src/**/*.tsx"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-extraneous-class": "off",
            "@typescript-eslint/no-dynamic-delete": "off",
            "@typescript-eslint/no-invalid-void-type": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                },
            ],
        },
    },

    eslintConfigPrettier,
];

export default config;
