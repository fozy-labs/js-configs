import eslintConfig from "../eslint/index.js";
import prettierConfig from "../prettier/index.js";
import vitestConfig from "../vitest/index.js";
import { editorconfigTemplate } from "../cli/templates/editorconfig.js";
import { gitignoreTemplate } from "../cli/templates/gitignore.js";
import { prettierignoreTemplate } from "../cli/templates/prettierignore.js";

describe("Config snapshots", () => {
    // T15: ESLint config snapshot (serializable subset)
    it("eslint config matches snapshot", () => {
        const serializable = eslintConfig.map((c) => ({
            ...(c.name ? { name: c.name } : {}),
            ...(c.rules ? { rules: c.rules } : {}),
            ...(c.ignores ? { ignores: c.ignores } : {}),
            ...(c.files ? { files: c.files } : {}),
        }));
        expect(serializable).toMatchSnapshot();
    });

    // T16: Prettier config snapshot
    it("prettier config matches snapshot", () => {
        expect(prettierConfig).toMatchSnapshot();
    });

    // T17: Vitest config snapshot
    it("vitest config matches snapshot", () => {
        expect(vitestConfig).toMatchSnapshot();
    });

    // T18: CLI templates snapshot
    it("CLI templates match snapshot", () => {
        expect({
            editorconfig: editorconfigTemplate,
            gitignore: gitignoreTemplate,
            prettierignore: prettierignoreTemplate,
        }).toMatchSnapshot();
    });
});
