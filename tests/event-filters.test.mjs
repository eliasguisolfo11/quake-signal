import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));

async function loadTypeScriptModule(relativePath) {
  const source = await readFile(resolve(testDirectory, relativePath), "utf8");
  const compiledSource = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return import(`data:text/javascript,${encodeURIComponent(compiledSource)}`);
}

const {
  filterEvents,
  magnitudeBandKey,
  summarizeEvents,
  MAGNITUDE_BANDS,
} = await loadTypeScriptModule("../src/features/events/lib/event-filters.ts");
const { describeActiveFilters } = await loadTypeScriptModule(
  "../src/features/events/lib/event-labels.ts",
);

function createEvent(id, { magnitude, continent, originTime }) {
  return {
    id,
    magnitude,
    place: id,
    coordinates: null,
    depthKm: null,
    originTime,
    updatedAt: null,
    alert: null,
    url: null,
    continent,
  };
}

const events = [
  createEvent("same-threshold", {
    magnitude: 2.5,
    continent: "North America",
    originTime: "2026-10-20T10:00:00.000Z",
  }),
  createEvent("below-threshold", {
    magnitude: 2.4,
    continent: "North America",
    originTime: "2026-10-20T11:00:00.000Z",
  }),
  createEvent("missing-magnitude", {
    magnitude: null,
    continent: "North America",
    originTime: "2026-10-20T12:00:00.000Z",
  }),
  createEvent("other-continent", {
    magnitude: 4.2,
    continent: "Europe",
    originTime: "2026-10-20T13:00:00.000Z",
  }),
];

test("includes an event equal to the threshold and applies the continent filter", () => {
  const filtered = filterEvents(events, {
    minMagnitude: 2.5,
    continent: "North America",
  });

  assert.deepEqual(filtered.map((event) => event.id), ["same-threshold"]);
  assert.deepEqual(summarizeEvents(filtered), { count: 1, maxMagnitude: 2.5 });
});

test("keeps missing magnitudes without a threshold and sorts newest first", () => {
  const filtered = filterEvents(events, { minMagnitude: null, continent: "world" });

  assert.deepEqual(
    filtered.map((event) => event.id),
    ["other-continent", "missing-magnitude", "below-threshold", "same-threshold"],
  );
  assert.deepEqual(summarizeEvents(filtered), { count: 4, maxMagnitude: 4.2 });
  assert.deepEqual(summarizeEvents([events[2]]), { count: 1, maxMagnitude: null });
});

test("names the active magnitude and continent filters in an empty state", () => {
  assert.deepEqual(
    describeActiveFilters({ minMagnitude: 2.5, continent: "Europe" }),
    ["Magnitud mínima ≥ 2,5", "Europa"],
  );
  assert.deepEqual(
    describeActiveFilters({ minMagnitude: null, continent: "world" }),
    [],
  );
});

test("assigns every magnitude boundary to exactly one declared map band", () => {
  const cases = [
    [1.99, "under-2"],
    [2, "2-to-3"],
    [2.99, "2-to-3"],
    [3, "3-to-4"],
    [3.99, "3-to-4"],
    [4, "4-to-5"],
    [4.99, "4-to-5"],
    [5, "5-to-6"],
    [5.99, "5-to-6"],
    [6, "6-to-7"],
    [6.99, "6-to-7"],
    [7, "7-plus"],
    [8.2, "7-plus"],
    [null, "unknown"],
  ];

  for (const [magnitude, expectedBand] of cases) {
    assert.equal(magnitudeBandKey(magnitude), expectedBand);
  }
  assert.deepEqual(
    MAGNITUDE_BANDS.map((band) => band.label),
    [
      "m < 2,0",
      "2,0 ≤ m < 3,0",
      "3,0 ≤ m < 4,0",
      "4,0 ≤ m < 5,0",
      "5,0 ≤ m < 6,0",
      "6,0 ≤ m < 7,0",
      "m ≥ 7,0",
    ],
  );
});
