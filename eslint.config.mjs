import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,

  // Build output folders, the local development database scripts and the tests are not linted.

  globalIgnores([".next/**", ".next-*/**", "scripts/dev-db/**", "next-env.d.ts", "tests/**"]),
]);
