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
      resolveJsonModule: true,
      esModuleInterop: true,
    },
  }).outputText;

  loadedModule._compile(compiled, filename);
};

const { classifyContinent } = require(
  resolve(testDirectory, "../src/features/events/lib/continents.ts"),
);
const { filterEvents } = require(
  resolve(testDirectory, "../src/features/events/lib/event-filters.ts"),
);
const fixture = JSON.parse(
  readFileSync(resolve(testDirectory, "fixtures/continent-cases.json"), "utf8"),
);

function createEvent(id, coordinates, continent) {
  return {
    id,
    magnitude: 2.4,
    place: id,
    coordinates,
    depthKm: 10,
    originTime: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    alert: null,
    url: null,
    continent,
  };
}

test("classifies representative locations and keeps the Americas split", () => {
  for (const item of fixture.classified) {
    assert.equal(
      classifyContinent(item.coordinates),
      item.continent,
      item.name,
    );
  }
});

test("leaves ocean locations and events without coordinates unclassified", () => {
  for (const item of fixture.unclassified) {
    assert.equal(classifyContinent(item.coordinates), null, item.name);
  }
});

test("regional filters exclude unclassified events while world includes them", () => {
  const southAmerica = fixture.classified.find((item) => item.continent === "South America");
  const atlantic = fixture.unclassified.find((item) => item.name === "Atlantic Ocean");
  const events = [
    createEvent(
      southAmerica.name,
      southAmerica.coordinates,
      classifyContinent(southAmerica.coordinates),
    ),
    createEvent(
      atlantic.name,
      atlantic.coordinates,
      classifyContinent(atlantic.coordinates),
    ),
  ];

  const filtered = filterEvents(events, {
    minMagnitude: null,
    continent: "South America",
  });
  const world = filterEvents(events, {
    minMagnitude: null,
    continent: "world",
  });

  assert.deepEqual(filtered.map((event) => event.id), ["Buenos Aires"]);
  assert.equal(world.length, 2);
});