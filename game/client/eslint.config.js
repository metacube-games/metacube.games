import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import oxlint from "eslint-plugin-oxlint";
import globals from "globals";

export default [
  {
    ignores: [
      "dist",
      "node_modules",
      "eslint.config.js",
      "public/**",
      "src/GLBImports/**",
      "src/envData/**",
      "**/*.config.{js,ts,mjs}",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.worker,
        ...globals.serviceworker,
      },
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // HMR-only hint, doesn't affect production. Game client uses many
      // mixed-export files (engine constants alongside components).
      "react-refresh/only-export-components": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      // TypeScript handles undefined checks itself; no-undef misfires on
      // type-only names like NodeJS, JSX, React, GLTFAction.
      "no-undef": "off",
      // Defer to the typed variant.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Engine code, binary protocol decoding, and API payloads use `any`
      // pragmatically. Enforcing this rule offers little value here.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": false,
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  // Disables every ESLint rule that oxlint already enforces, so the two
  // linters never double-report the same finding.
  ...oxlint.configs["flat/recommended"],
  // Re-assert the rules ESLint should stay authoritative for. The React Hooks
  // plugin has the most mature dependency-array analysis, so it owns these even
  // though oxlint can approximate them.
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
