import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (loadedModule, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  loadedModule._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const presentationModel = require(resolve(testDirectory, "../src/features/analytics/lib/presentation-model.ts"));

test("ranks observed country counts and keeps ties deterministic", () => {
  assert.deepEqual(
    presentationModel.getObservedCountryRanking([
      { kind: "country", id: "b", name: "Chile", totalEvents: 12 },
      { kind: "country", id: "a", name: "Argentina", totalEvents: 12 },
      { kind: "country", id: "z", name: "Zero", totalEvents: 0 },
      { kind: "oceanic", id: "oceanic", totalEvents: 30 },
    ]),
    [
      { id: "a", name: "Argentina", totalEvents: 12 },
      { id: "b", name: "Chile", totalEvents: 12 },
    ],
  );
});

test("limits the country ranking without merging unassigned locations", () => {
  assert.deepEqual(
    presentationModel.getObservedCountryRanking([
      ...Array.from({ length: 7 }, (_, index) => ({
        kind: "country", id: String(index), name: `Country ${index}`, totalEvents: 7 - index,
      })),
      { kind: "oceanic", id: "oceanic", totalEvents: 20 },
    ], 5).map(({ id }) => id),
    ["0", "1", "2", "3", "4"],
  );
});

test("creates readable count ticks for populated and empty time series", () => {
  assert.deepEqual(presentationModel.getNiceCountTicks(0), [0, 1]);
  assert.deepEqual(presentationModel.getNiceCountTicks(17), [0, 5, 10, 15, 20]);
  assert.deepEqual(presentationModel.getNiceCountTicks(1), [0, 0.5, 1]);
});

test("rejects invalid ranking limits and chart ranges", () => {
  assert.throws(() => presentationModel.getObservedCountryRanking([], -1), RangeError);
  assert.throws(() => presentationModel.getNiceCountTicks(Number.NaN), RangeError);
});
