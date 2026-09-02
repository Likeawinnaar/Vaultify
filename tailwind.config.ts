import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#172129", mint: "#e9f8f1", vault: "#147a52" }, fontFamily: { sans: ["Manrope", "Arial", "sans-serif"], mono: ["DM Mono", "monospace"] } } }, plugins: [] } satisfies Config;

