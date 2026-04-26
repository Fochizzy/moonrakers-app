const fs = require("node:fs");
const path = require("node:path");

const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

function readDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

const projectRoot = path.resolve(__dirname, "..");
const dotEnvLocal = readDotEnvFile(path.join(projectRoot, ".env.local"));

const mergedEnv = {
  ...dotEnvLocal,
  ...process.env,
};

const missing = required.filter((key) => !String(mergedEnv[key] ?? "").trim());

if (missing.length > 0) {
  console.error(`Missing Supabase env vars: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Supabase env looks complete.");
