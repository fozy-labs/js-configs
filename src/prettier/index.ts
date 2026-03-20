import type { Config } from "prettier";

const config: Config = {
    tabWidth: 4,
    printWidth: 120,
    plugins: ["@ianvs/prettier-plugin-sort-imports"],
    importOrder: [
        "<BUILTIN_MODULES>",
        "",
        "<THIRD_PARTY_MODULES>",
        "",
        "^@/(.*)$",
        "",
        "^\\.\\./(.*)",
        "",
        "^\\./(.*)$",
    ],
    importOrderParserPlugins: ["typescript", "jsx", '["decorators", { "decoratorsBeforeExport": true }]'],
};

export default config;
