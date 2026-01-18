const eslintJs = require("@eslint/js");
const globals = require("globals");
const stylistic = require("@stylistic/eslint-plugin");

const baseConfig = eslintJs.configs.recommended;

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**"]
  },
  {
    ...baseConfig,
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ...baseConfig.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    plugins: {
      ...baseConfig.plugins,
      "@stylistic": stylistic
    },
    rules: {
      ...baseConfig.rules,
      "@stylistic/semi": ["error", "always"]
    }
  }
];
