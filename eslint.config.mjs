import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // App (Next.js)
  ...nextVitals,
  ...nextTs,

  // Scripts (Node tooling): keep it lintable but with relaxed rules.
  {
    files: ["scripts/**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      // Node scripts often legitimately use require() (pdf-parse, etc.).
      "@typescript-eslint/no-require-imports": "off",
      // Legacy scripts have a lot of any; keep informational lint useful without blocking.
      "@typescript-eslint/no-explicit-any": "off",
      // Common in scripts where throwaway vars exist.
      "@typescript-eslint/no-unused-vars": "off",
      // Low-value style/strictness rules for scripts
      "prefer-const": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "import/no-anonymous-default-export": "off",
      "eslint-comments/no-unused-disable": "off",
    },
  },

  // Global ignores
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Repo-specific ignores:
    "**/*.ps1",
    "audit-*.js",
    "public/sw.js",
  ]),
]);

export default eslintConfig;
