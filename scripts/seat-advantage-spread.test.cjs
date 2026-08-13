const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options
) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

const {
  computeSeatAdvantageSpread,
  computeSeatAdvantageSpreadFromArrays,
} = require("../utils/seatAdvantage.ts");

function buildSeatSamples(seatWinRates) {
  const samples = [];

  for (const [seat, wins, appearances] of seatWinRates) {
    for (let index = 0; index < appearances; index += 1) {
      samples.push({ seat, won: index < wins ? 1 : 0 });
    }
  }

  return samples;
}

// The regression this metric exists for. Seat 2 never wins while seats 1, 3 and 4
// all do; a Pearson correlation over the seat index reports ~0 for this shape and
// the Macro card renders as an empty "no data" tile.
const nonMonotonicTable = buildSeatSamples([
  [1, 8, 17],
  [2, 0, 17],
  [3, 5, 17],
  [4, 4, 9],
]);

const nonMonotonicSpread = computeSeatAdvantageSpread(nonMonotonicTable);

assert.ok(
  Math.abs(nonMonotonicSpread) > 0.4,
  `expected a non-monotonic seat effect to register, got ${nonMonotonicSpread}`,
);

assert.equal(
  Number(nonMonotonicSpread.toFixed(2)),
  -0.47,
  "expected best seat 1 (8/17) minus worst seat 2 (0/17), negated because the best seat is earlier",
);

// Sign convention: negative means earlier seats win more often.
assert.ok(
  computeSeatAdvantageSpread(
    buildSeatSamples([
      [1, 9, 10],
      [2, 1, 10],
    ]),
  ) < 0,
  "expected an early-seat advantage to read negative",
);

assert.ok(
  computeSeatAdvantageSpread(
    buildSeatSamples([
      [1, 1, 10],
      [2, 9, 10],
    ]),
  ) > 0,
  "expected a late-seat advantage to read positive",
);

// Every seat performing identically is a real zero, not a data gap.
assert.equal(
  computeSeatAdvantageSpread(
    buildSeatSamples([
      [1, 5, 10],
      [2, 5, 10],
      [3, 5, 10],
    ]),
  ),
  0,
  "expected identical seat win rates to produce no spread",
);

// Not enough data: a single seat lane, or lanes below the appearance floor.
assert.equal(
  computeSeatAdvantageSpread(buildSeatSamples([[1, 4, 10]])),
  0,
  "expected a single seat lane to produce no spread",
);

assert.equal(
  computeSeatAdvantageSpread(
    buildSeatSamples([
      [1, 2, 2],
      [2, 0, 2],
    ]),
  ),
  0,
  "expected lanes under the 3-appearance floor to be ignored",
);

assert.equal(
  computeSeatAdvantageSpread([]),
  0,
  "expected an empty sample to produce no spread",
);

// Seats below 1 are not real lanes; start_order is 0-based in some payloads and
// callers are responsible for shifting before calling in.
assert.equal(
  computeSeatAdvantageSpread(
    buildSeatSamples([
      [0, 5, 10],
      [1, 0, 10],
    ]),
  ),
  0,
  "expected seat values below 1 to be dropped, leaving too few lanes to compare",
);

// Group rows average their members' seats, so fractional seats must land in a lane.
assert.equal(
  Number(
    computeSeatAdvantageSpread(
      buildSeatSamples([
        [1.4, 8, 10],
        [2.6, 2, 10],
      ]),
    ).toFixed(2),
  ),
  -0.6,
  "expected fractional seats to round into the nearest whole lane",
);

// The paired-array wrapper must agree with the sample-object form.
assert.equal(
  computeSeatAdvantageSpreadFromArrays(
    nonMonotonicTable.map((sample) => sample.seat),
    nonMonotonicTable.map((sample) => sample.won),
  ),
  nonMonotonicSpread,
  "expected the array wrapper to match the sample-object result",
);

assert.equal(
  computeSeatAdvantageSpreadFromArrays([1, 2, 3], []),
  0,
  "expected mismatched array lengths to fall back to no spread",
);

console.log("seat-advantage-spread.test.cjs passed");
