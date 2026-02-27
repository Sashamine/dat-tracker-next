import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // NOTE: We intentionally ignore legacy tooling/scripts to keep lint signal focused on app code.
  // Follow-up can add a separate `lint:scripts` with Node-specific rules.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Repo-specific ignores:
    "scripts/**",
    "**/*.ps1",
    "audit-*.js",
    "public/sw.js",
  ]),
]);

export default eslintConfig;
