import config from "@chewbaccacookie/eslint-config/typescript";
import { Linter } from "eslint";

/**
 * @type {Linter.Config[]}
 * @description ESLint configuration for TypeScript projects, extending the base TypeScript config and disabling the unicorn/number-literal-case rule.
 */
export default [
    ...config,
    {
        files: ["examples/**/*"],
        rules: {
            "no-console": "off",
            "unicorn/no-process-exit": "off",
        },
    },
    {
        rules: {
            "unicorn/number-literal-case": "off",
        },
    },
    {
        languageOptions: {
            globals: {
                NodeJS: "readonly"
            }
        }
    }
];
