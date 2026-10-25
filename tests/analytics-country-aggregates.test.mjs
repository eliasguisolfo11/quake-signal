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

const { aggregateGeography } = require(
  resolve(testDirectory, "../src/features/analytics/lib/country-analytics.ts"),
);
const { createEpicenterClassifier } = require(
  resolve(testDirectory, "../src/features/analytics/lib/geographic-classification.ts"),
);

function polygon(coordinates) {
  return { type: "Polygon", coordinates };
}

function feature(id, name, geometry) {
  return {
    type: "Feature",
    properties: { countryId: id, name, continent: "North America" },
    geometry,
  };
}

function collection(features) {
  return { type: "FeatureCollection", features };
}

function event(id, values = {}) {
  return {
    id,
    magnitude: null,
    place: "Free text is not used for assignment",
    coordinates: { longitude: -5, latitude: 0 },
    depthKm: null,
    originTime: "2024-02-01T12:00:00.000Z",
    updatedAt: null,
    url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
    ...values,
  };
}

const west = feature(
  "WST",
  "Westland",
  polygon([[[-10, -5], [0, -5], [0, 5], [-10, 5], [-10, -5]]]),
);
const east = feature(
  "EST",
  "Eastland",
  polygon([[[0, -5], [10, -5], [10, 5], [0, 5], [0, -5]]]),
);
const classifier = createEpicenterClassifier(
  collection([west, east]),
  collection([
    west,
    east,
    feature(
      "ISL",
      "Unmapped island",
      polygon([[[15, -5], [20, -5], [20, 5], [15, 5], [15, -5]]]),
    ),
  ]),
);

const window = {
  startInclusive: "2024-02-01T06:00:00.000Z",
  endExclusive: "2024-02-04T06:00:00.000Z",
};

test("geographic groups and every temporal series reconcile with the unique event total", () => {
  const result = aggregateGeography(
    [
      event("a", { magnitude: 5 }),
      event("b", { magnitude: 5, originTime: "2024-02-02T12:00:00.000Z" }),
      event("c", { magnitude: 4, originTime: "2024-02-03T12:00:00.000Z" }),
      event("d", { originTime: "2024-02-03T23:00:00.000Z" }),
      event("e", { magnitude: 3, originTime: "2024-02-04T01:00:00.000Z" }),
      event("f", { magnitude: 2, originTime: "2024-02-02T10:00:00.000Z" }),
      event("ocean", { coordinates: { longitude: 30, latitude: 0 } }),
      event("land", { coordinates: { longitude: 17, latitude: 0 } }),
      event("border", { coordinates: { longitude: 0, latitude: 1 } }),
      event("missing", { coordinates: null }),
      event("a", { magnitude: 1 }),
    ],
    { period: "30d", window },
    classifier,
  );

  assert.equal(result.totalEvents, 10);
  assert.equal(result.groups.reduce((total, group) => total + group.totalEvents, 0), 10);
  for (const group of result.groups) {
    assert.equal(
      group.timeSeries.reduce((total, bucket) => total + bucket.count, 0),
      group.totalEvents,
      group.id,
    );
  }
  assert.equal(result.groups.find(({ id }) => id === "oceanic").totalEvents, 1);
  assert.equal(result.groups.find(({ id }) => id === "land-unassigned").totalEvents, 1);
  assert.equal(result.groups.find(({ id }) => id === "border-overlap").totalEvents, 1);
  assert.equal(result.groups.find(({ id }) => id === "no-coordinates").totalEvents, 1);
});

test("country profiles apply deterministic tie breaks and do not repeat events", () => {
  const result = aggregateGeography(
    [
      event("a", { magnitude: 5 }),
      event("b", { magnitude: 5, originTime: "2024-02-02T12:00:00.000Z" }),
      event("c", { magnitude: 4, originTime: "2024-02-03T12:00:00.000Z" }),
      event("d", { originTime: "2024-02-03T23:00:00.000Z" }),
      event("e", { magnitude: 3, originTime: "2024-02-04T01:00:00.000Z" }),
      event("f", { magnitude: 2, originTime: "2024-02-02T10:00:00.000Z" }),
    ],
    { period: "30d", window },
    classifier,
  );

  const country = result.groups.find(({ id }) => id === "country:WST");
  assert.equal(country.totalEvents, 6);
  assert.deepEqual(country.strongestEvents.map(({ id }) => id), ["b", "a", "c", "e", "f"]);
  assert.deepEqual(country.recentEvents.map(({ id }) => id), ["d"]);
  assert.equal(
    new Set([
      ...country.strongestEvents.map(({ id }) => id),
      ...country.recentEvents.map(({ id }) => id),
    ]).size,
    6,
  );
  assert.deepEqual(
    country.timeSeries.map(({ count }) => count),
    [1, 2, 2, 1],
  );
});

test("includes zero-count countries so choropleth data has complete geography", () => {
  const result = aggregateGeography(
    [event("one")],
    { period: "12m", window },
    classifier,
  );

  const emptyCountry = result.groups.find(({ id }) => id === "country:ARG");
  assert.equal(emptyCountry.totalEvents, 0);
  assert.ok(emptyCountry.timeSeries.every(({ count }) => count === 0));
});
