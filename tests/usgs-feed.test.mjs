import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(testDirectory, "../src/features/events/lib/usgs-feed.ts");
const source = await readFile(sourcePath, "utf8");
const compiledSource = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const feedParser = await import("data:text/javascript," + encodeURIComponent(compiledSource));
const { getUsgsFeedUrl, parseUsgsFeed, UsgsFeedError } = feedParser;

async function readFixture(name) {
  const fixturePath = resolve(testDirectory, "fixtures", name);
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

test("selects the documented USGS feed for each period", () => {
  assert.equal(
    getUsgsFeedUrl("hour"),
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
  );
  assert.equal(
    getUsgsFeedUrl("day"),
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  );
  assert.equal(
    getUsgsFeedUrl("week"),
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
  );
});

test("treats a valid empty feed as an empty result", async () => {
  const result = parseUsgsFeed(await readFixture("valid-empty.geojson"));

  assert.equal(result.generatedAt, "2026-01-01T00:00:00.000Z");
  assert.deepEqual(result.events, []);
});

test("normalizes valid events, preserves missing fields, and skips invalid features", async () => {
  const result = parseUsgsFeed(await readFixture("partially-invalid.geojson"));

  assert.equal(result.events.length, 2);
  assert.deepEqual(result.events[0], {
    id: "us7000fixture",
    magnitude: 4.2,
    place: "Example coast",
    coordinates: { longitude: -73.9, latitude: 40.7 },
    depthKm: 12.4,
    originTime: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
    alert: "green",
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000fixture",
    continent: null,
  });
  assert.deepEqual(result.events[1], {
    id: "us7000missing-fields",
    magnitude: null,
    place: null,
    coordinates: null,
    depthKm: null,
    originTime: "2026-01-01T00:00:02.000Z",
    updatedAt: null,
    alert: null,
    url: null,
    continent: null,
  });
});

test("rejects a non-empty feed when every feature is invalid", async () => {
  const input = await readFixture("all-invalid.geojson");

  assert.throws(() => parseUsgsFeed(input), UsgsFeedError);
});

test("rejects a malformed GeoJSON collection", async () => {
  const input = await readFixture("invalid-structure.geojson");

  assert.throws(() => parseUsgsFeed(input), UsgsFeedError);
});

test("rejects an upstream feed error reported in metadata", async () => {
  const input = await readFixture("source-error.geojson");

  assert.throws(() => parseUsgsFeed(input), UsgsFeedError);
});