// Runs every test in scripts/ — .test.cjs and .test.ts alike.
//
// The focused suites (test:analytics, test:ui) exist for fast local loops; this
// is the one that must stay green, so a guard cannot quietly rot after a
// refactor the way a dozen of them did before it existed.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const scriptsDir = __dirname;
const only = process.argv[2] ? String(process.argv[2]).toLowerCase() : null;

const testFiles = fs
  .readdirSync(scriptsDir)
  .filter((file) => /\.test\.(cjs|ts)$/.test(file))
  .filter((file) => (only ? file.toLowerCase().includes(only) : true))
  .sort();

if (!testFiles.length) {
  console.error(only ? `No tests matched "${only}".` : "No tests found.");
  process.exit(1);
}

const failures = [];
const startedAt = process.hrtime.bigint();

for (const file of testFiles) {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, file)], {
    encoding: "utf8",
    // Node warns about the missing package "type" field for every .test.ts.
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });

  if (result.status === 0) {
    process.stdout.write(".");
    continue;
  }

  process.stdout.write("F");
  failures.push({
    file,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  });
}

const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
process.stdout.write("\n\n");

for (const failure of failures) {
  console.error(`FAIL ${failure.file}`);
  console.error(
    failure.output
      .split("\n")
      .slice(0, 12)
      .map((line) => `    ${line}`)
      .join("\n"),
  );
  console.error("");
}

const passed = testFiles.length - failures.length;
console.log(
  `${passed}/${testFiles.length} passed in ${(elapsedMs / 1000).toFixed(1)}s`,
);

process.exit(failures.length ? 1 : 0);
