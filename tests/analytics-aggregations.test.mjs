import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

require.extensions[".ts"] = (loadedModule, filename) => {
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  loadedModule._compile(compiled, filename);
};

const { aggregateAnalytics } = require(
  resolve(testDirectory, "../src/features/analytics/lib/aggregations.ts"),
);

function event(id, values = {}) {
  return {
    id,
    magnitude: null,
    place: null,
    coordinates: null,
    depthKm: null,
    originTime: "2024-02-01T12:00:00.000Z",
    updatedAt: null,
    url: null,
    ...values,
  };
}

const dayWindow = {
  startInclusive: "2024-02-01T06:00:00.000Z",
  endExclusive: "2024-02-04T06:00:00.000Z",
};

test("deduplicates events and calculates total, maximum, median, and missing data", () => {
  const first = event("one", { magnitude: 3, depthKm: 70 });
  const result = aggregateAnalytics(
    [
      first,
      { ...first },
      event("two", {
        magnitude: null,
        depthKm: 300,
        originTime: "2024-02-02T12:00:00.000Z",
      }),
      event("three", {
        magnitude: 5,
        depthKm: 301,
        originTime: "2024-02-03T12:00:00.000Z",
      }),
    ],
    { period: "30d", window: dayWindow, minMagnitude: null },
  );

  assert.equal(result.totalEvents, 3);
  assert.equal(result.maximumMagnitude, 5);
  assert.equal(result.medianMagnitude, 4);
  assert.equal(result.eventsWithMagnitude, 2);
  assert.equal(result.eventsWithoutMagnitude, 1);
  assert.deepEqual(
    result.timeSeries.map(({ bucketStart, count }) => [bucketStart, count]),
    [
      ["2024-02-01T00:00:00.000Z", 1],
      ["2024-02-02T00:00:00.000Z", 1],
      ["2024-02-03T00:00:00.000Z", 1],
      ["2024-02-04T00:00:00.000Z", 0],
    ],
  );
});

test("assigns magnitude values to the shared bands and includes no-data only without a threshold", () => {
  const magnitudes = [1.9, 2, 2.99, 3, 3.99, 4, 4.99, 5, 5.99, 6, 6.99, 7, null];
  const result = aggregateAnalytics(
    magnitudes.map((magnitude, index) => event("m-" + index, { magnitude })),
    { period: "30d", window: dayWindow, minMagnitude: null },
  );

  assert.deepEqual(
    result.magnitudeDistribution.map(({ key, count }) => [key, count]),
    [
      ["under-2", 1],
      ["2-to-3", 2],
      ["3-to-4", 2],
      ["4-to-5", 2],
      ["5-to-6", 2],
      ["6-to-7", 2],
      ["7-plus", 1],
      ["unknown", 1],
    ],
  );
});

test("applies an inclusive minimum magnitude and excludes missing magnitude", () => {
  const result = aggregateAnalytics(
    [
      event("equal", { magnitude: 3.2 }),
      event("below", { magnitude: 3.1 }),
      event("higher", { magnitude: 4 }),
      event("missing", { magnitude: null }),
    ],
    { period: "30d", window: dayWindow, minMagnitude: 3.2 },
  );

  assert.equal(result.totalEvents, 2);
  assert.equal(result.eventsWithMagnitude, 2);
  assert.equal(result.eventsWithoutMagnitude, 0);
  assert.equal(
    result.magnitudeDistribution.reduce((sum, band) => sum + band.count, 0),
    2,
  );
  assert.equal(result.magnitudeDistribution.some(({ key }) => key === "unknown"), false);
});

test("accepts negative minimum magnitudes in tenths, matching the existing control", () => {
  const result = aggregateAnalytics(
    [
      event("negative", { magnitude: -0.2 }),
      event("equal", { magnitude: -0.1 }),
      event("positive", { magnitude: 0.1 }),
      event("missing", { magnitude: null }),
    ],
    { period: "30d", window: dayWindow, minMagnitude: -0.1 },
  );

  assert.deepEqual(result.events.map(({ id }) => id), ["equal", "positive"]);
  assert.equal(result.totalEvents, 2);
});

test("classifies exact depth boundaries and keeps out-of-class and missing values separate", () => {
  const depths = [0, 70, 70.1, 300, 300.1, 700, 700.1, -1, null];
  const result = aggregateAnalytics(
    depths.map((depthKm, index) => event("d-" + index, { depthKm })),
    { period: "30d", window: dayWindow, minMagnitude: null },
  );

  assert.deepEqual(
    result.depthDistribution.map(({ key, count }) => [key, count]),
    [
      ["shallow", 2],
      ["intermediate", 2],
      ["deep", 2],
      ["outside-standard", 2],
      ["unknown", 1],
    ],
  );
});

test("uses UTC calendar buckets, includes empty months, and respects the half-open window", () => {
  const result = aggregateAnalytics(
    [
      event("before", { originTime: "2024-01-15T11:59:59.999Z", magnitude: 1 }),
      event("jan", { originTime: "2024-01-31T00:00:00.000Z", magnitude: 1 }),
      event("feb", { originTime: "2024-02-01T00:00:00.000Z", magnitude: 1 }),
      event("mar", { originTime: "2024-03-31T23:59:59.999Z", magnitude: 1 }),
      event("at-end", { originTime: "2024-04-01T00:00:00.000Z", magnitude: 1 }),
    ],
    {
      period: "12m",
      window: {
        startInclusive: "2024-01-15T12:00:00.000Z",
        endExclusive: "2024-04-01T00:00:00.000Z",
      },
      minMagnitude: null,
    },
  );

  assert.equal(result.totalEvents, 3);
  assert.deepEqual(
    result.timeSeries.map(({ bucketStart, count }) => [bucketStart, count]),
    [
      ["2024-01-01T00:00:00.000Z", 1],
      ["2024-02-01T00:00:00.000Z", 1],
      ["2024-03-01T00:00:00.000Z", 1],
    ],
  );
});

test("ignores events outside the exact window before calculating all metrics", () => {
  const result = aggregateAnalytics(
    [
      event("at-start", { originTime: dayWindow.startInclusive, magnitude: 2 }),
      event("at-end", { originTime: dayWindow.endExclusive, magnitude: 9 }),
    ],
    { period: "30d", window: dayWindow, minMagnitude: null },
  );

  assert.equal(result.totalEvents, 1);
  assert.equal(result.maximumMagnitude, 2);
  assert.equal(result.timeSeries.reduce((sum, bucket) => sum + bucket.count, 0), 1);
});
