import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const eslintRequire = createRequire(require.resolve("eslint/package.json"));
const { FlatCompat } = eslintRequire("@eslint/eslintrc");
const compat = new FlatCompat({ baseDirectory: fileURLToPath(new URL(".", import.meta.url)) });
export default [
  { ignores: [".next/**", "node_modules/**", "data/**", "work/**", "outputs/**", "tsconfig.tsbuildinfo"] },
  ...compat.extends("next/core-web-vitals"),
];
