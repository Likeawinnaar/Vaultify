import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**", "data/**", "work/**", "outputs/**", "playwright-report/**", "test-results/**", "tsconfig.tsbuildinfo"]),
]);
