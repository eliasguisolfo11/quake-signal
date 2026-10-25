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

const { classifyEpicenter, createEpicenterClassifier } = require(
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
const land = collection([
  west,
  east,
  feature(
    "ISL",
    "Unmapped island",
    polygon([[[15, -5], [20, -5], [20, 5], [15, 5], [15, -5]]]),
  ),
]);

test("assigns an interior epicenter to the only matching country", () => {
  const classify = createEpicenterClassifier(collection([west, east]), land);

  assert.deepEqual(classify({ longitude: -5, latitude: 0 }), {
    kind: "country",
    countryId: "WST",
    name: "Westland",
    continent: "North America",
  });
});

test("separates ocean, land without country, and missing or invalid coordinates", () => {
  const classify = createEpicenterClassifier(collection([west, east]), land);

  assert.deepEqual(classify({ longitude: 30, latitude: 0 }), { kind: "oceanic" });
  assert.deepEqual(classify({ longitude: 17, latitude: 0 }), { kind: "land-unassigned" });
  assert.deepEqual(classify(null), { kind: "no-coordinates" });
  assert.deepEqual(classify({ longitude: 181, latitude: 0 }), { kind: "no-coordinates" });
  assert.deepEqual(classify({ longitude: 0, latitude: 91 }), { kind: "no-coordinates" });
});

test("keeps shared borders and overlapping country interiors unassigned", () => {
  const overlap = feature(
    "OVR",
    "Overlap",
    polygon([[[5, -2], [8, -2], [8, 2], [5, 2], [5, -2]]]),
  );
  const classify = createEpicenterClassifier(collection([west, east, overlap]), land);

  assert.deepEqual(classify({ longitude: 0, latitude: 1 }), { kind: "border-overlap" });
  assert.deepEqual(classify({ longitude: 6, latitude: 0 }), { kind: "border-overlap" });
});

test("respects polygon holes when distinguishing ocean from land", () => {
  const withLake = feature(
    "HOLLOW",
    "Hollowland",
    polygon([
      [[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]],
      [[-2, -2], [2, -2], [2, 2], [-2, 2], [-2, -2]],
    ]),
  );
  const classify = createEpicenterClassifier(
    collection([withLake]),
    collection([withLake]),
  );

  assert.deepEqual(classify({ longitude: 5, latitude: 0 }), {
    kind: "country",
    countryId: "HOLLOW",
    name: "Hollowland",
    continent: "North America",
  });
  assert.deepEqual(classify({ longitude: 0, latitude: 0 }), { kind: "oceanic" });
});

test("unwraps polygons across the antimeridian", () => {
  const dateline = feature(
    "DATE",
    "Dateline",
    polygon([[[170, -10], [-170, -10], [-170, 10], [170, 10], [170, -10]]]),
  );
  const classify = createEpicenterClassifier(collection([dateline]), collection([dateline]));

  assert.deepEqual(classify({ longitude: -179, latitude: 0 }), {
    kind: "country",
    countryId: "DATE",
    name: "Dateline",
    continent: "North America",
  });
});

test("detects empty or invalid coordinates before geometry lookup", () => {
  const classify = createEpicenterClassifier(collection([west]), land);

  assert.deepEqual(classify({ longitude: Number.NaN, latitude: 0 }), {
    kind: "no-coordinates",
  });
});

test("classifies representative real coordinates from the pinned Natural Earth datasets", () => {
  assert.deepEqual(classifyEpicenter({ longitude: -58.3816, latitude: -34.6037 }), {
    kind: "country",
    countryId: "ARG",
    name: "Argentina",
    continent: "South America",
  });
  assert.deepEqual(classifyEpicenter({ longitude: -130, latitude: 0 }), {
    kind: "oceanic",
  });
});
