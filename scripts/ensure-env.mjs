import crypto from "node:crypto";
import fs from "node:fs";

const envPath = ".env";
const defaults = {
  NODE_ENV: "development",
  VAULTIFY_MASTER_KEY: crypto.randomBytes(32).toString("base64"),
  VAULTIFY_DATA_DIR: "./data",
  VAULTIFY_SESSION_DAYS: "30",
  VAULTIFY_RATE_LIMIT_PER_MINUTE: "60",
};

const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const present = new Set(existing.split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1]).filter(Boolean));
const missing = Object.entries(defaults).filter(([key]) => !present.has(key));
if (missing.length) {
  const suffix = existing && !existing.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(envPath, `${existing}${suffix}${missing.map(([key, value]) => `${key}=${value}`).join("\n")}\n`, { mode: 0o600 });
  console.log(`Vaultify environment ready: added ${missing.map(([key]) => key).join(", ")}`);
} else {
  console.log("Vaultify environment ready: existing values preserved");
}
