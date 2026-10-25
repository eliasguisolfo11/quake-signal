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

const { computeNearestTectonicBoundary } = require(
  resolve(testDirectory, "../src/features/analytics/lib/tectonic-context.ts"),
);

function lineFeature(id, name, boundaryType, geometry) {
  return {
    type: "Feature",
    id,
    properties: {
      sourceObjectId: id,
      boundaryName: name,
      boundaryType,
    },
    geometry,
  };
}

function collection(features) {
  return { type: "FeatureCollection", features };
}

test("finds the closest great-circle line segment and returns its observed label", () => {
  const boundaries = collection([
    lineFeature(2, "Far boundary", "Other", {
      type: "LineString",
      coordinates: [[0, 5], [10, 5]],
    }),
    lineFeature(1, "Nearby boundary", "Convergent Boundary", {
      type: "LineString",
      coordinates: [[0, 0], [10, 0]],
    }),
  ]);

  assert.deepEqual(
    computeNearestTectonicBoundary({ longitude: 5, latitude: 2 }, boundaries),
    {
      sourceObjectId: 1,
      boundaryName: "Nearby boundary",
      boundaryType: "Convergent Boundary",
      distanceKm: 222.4,
    },
  );
});

test("retains a boundary type when the USGS boundary name is missing", () => {
  const context = computeNearestTectonicBoundary(
    { longitude: 0, latitude: 0 },
    collection([
      lineFeature(1, null, "Transform Boundary", {
        type: "LineString",
        coordinates: [[-2, 0], [2, 0]],
      }),
    ]),
  );

  assert.equal(context?.boundaryName, null);
  assert.equal(context?.boundaryType, "Transform Boundary");
  assert.equal(context?.distanceKm, 0);
});

test("measures the short segment across the antimeridian", () => {
  const context = computeNearestTectonicBoundary(
    { longitude: 180, latitude: 1 },
    collection([
      lineFeature(1, "Dateline boundary", "Divergent Boundary", {
        type: "LineString",
        coordinates: [[179, 0], [-179, 0]],
      }),
    ]),
  );

  assert.equal(context?.sourceObjectId, 1);
  assert.equal(context?.distanceKm, 111.2);
});

test("returns no tectonic result for invalid or missing epicenter coordinates", () => {
  const boundaries = collection([
    lineFeature(1, "Boundary", "Other", {
      type: "LineString",
      coordinates: [[0, 0], [10, 0]],
    }),
  ]);

  assert.equal(computeNearestTectonicBoundary(null, boundaries), null);
  assert.equal(computeNearestTectonicBoundary({ longitude: 181, latitude: 0 }, boundaries), null);
  assert.equal(computeNearestTectonicBoundary({ longitude: 0, latitude: Number.NaN }, boundaries), null);
});

test("returns no result when the snapshot has no usable line segments", () => {
  assert.equal(computeNearestTectonicBoundary(
    { longitude: 0, latitude: 0 },
    collection([
      {
        type: "Feature",
        id: 1,
        properties: {
          sourceObjectId: 1,
          boundaryName: "Incomplete",
          boundaryType: "Other",
        },
        geometry: { type: "LineString", coordinates: [[0, 0]] },
      },
    ]),
  ), null);
});
