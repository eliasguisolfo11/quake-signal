import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (loadedModule, filename) => {
  let source = require("node:fs").readFileSync(filename, "utf8");
  source = source.replaceAll(
    JSON.stringify("@/features/events/lib/types"),
    JSON.stringify(resolve(testDirectory, "../src/features/events/lib/types.ts")),
  );
  loadedModule._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const analyticsClient = require(resolve(testDirectory, "../src/features/analytics/lib/client-api.ts"));

const validResponse = {
  data: { summary: { totalEvents: 0, timeSeries: [], magnitudeDistribution: [], depthDistribution: [] }, geography: { totalEvents: 0, groups: [] } },
  meta: {
    source: "USGS",
    sourceUrl: "https://earthquake.usgs.gov/fdsnws/event/1/query",
    period: "30d",
    filters: { minMagnitude: null, continent: "world" },
    window: { startInclusive: "2026-09-01T00:00:00.000Z", endExclusive: "2026-10-01T00:00:00.000Z" },
    requestedAt: "2026-10-01T00:00:00.000Z",
    retrievedAt: "2026-10-01T00:00:01.000Z",
    coverageNote: "Catalog retrieval status only.",
    recovery: { status: "complete", expectedCount: 0, retrievedCount: 0, attempts: 1 },
    resultStatus: "catalog-empty",
    query: { countUrl: "https://example.test/count", firstPageUrl: "https://example.test/query", sourceMinimumMagnitude: null, pageLimit: 20000 },
    geography: { countries: "Natural Earth", land: "Natural Earth" },
  },
};

test("serializes shareable analytics filters for the API", () => {
  assert.equal(
    analyticsClient.buildAnalyticsRequestUrl({ period: "12m", minMagnitude: 3.2, continent: "South America" }),
    "/api/v1/analytics?period=12m&minMagnitude=3.2&continent=South+America",
  );
});

test("omits a missing magnitude filter while preserving the world scope", () => {
  assert.equal(
    analyticsClient.buildAnalyticsRequestUrl({ period: "30d", minMagnitude: null, continent: "world" }),
    "/api/v1/analytics?period=30d&continent=world",
  );
});

test("parses magnitude thresholds in tenths including negative values", () => {
  assert.deepEqual(analyticsClient.parseMinimumMagnitudeInput("-0,1"), { value: -0.1, error: null });
  assert.deepEqual(analyticsClient.parseMinimumMagnitudeInput(" 3.2 "), { value: 3.2, error: null });
  assert.deepEqual(analyticsClient.parseMinimumMagnitudeInput(""), { value: null, error: null });
  assert.equal(analyticsClient.parseMinimumMagnitudeInput("3.25").error, "La magnitud mínima debe usar incrementos de 0,1.");
});

test("normalizes invalid URL filters to supported defaults", () => {
  assert.deepEqual(
    analyticsClient.parseAnalyticsFilters(new URLSearchParams("period=90d&minMagnitude=bad&continent=Atlantis")),
    { period: "30d", minMagnitude: null, continent: "world" },
  );
  assert.deepEqual(
    analyticsClient.parseAnalyticsFilters(new URLSearchParams("period=5y&minMagnitude=-0.2&continent=South+America")),
    { period: "5y", minMagnitude: -0.2, continent: "South America" },
  );
});

test("fetches a typed complete response without caching", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (...args) => {
    request = args;
    return Response.json(validResponse);
  };
  try {
    assert.deepEqual(
      await analyticsClient.fetchAnalytics({ period: "30d", minMagnitude: null, continent: "world" }),
      validResponse,
    );
    assert.equal(request[0], "/api/v1/analytics?period=30d&continent=world");
    assert.equal(request[1].cache, "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("surfaces API errors and rejects malformed success payloads", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ error: { code: "SOURCE_UNAVAILABLE", message: "USGS no responde." } }, { status: 502 });
    await assert.rejects(
      analyticsClient.fetchAnalytics({ period: "30d", minMagnitude: null, continent: "world" }),
      (error) => error.code === "SOURCE_UNAVAILABLE" && error.message === "USGS no responde.",
    );
    globalThis.fetch = async () => Response.json({ data: {}, meta: {} });
    await assert.rejects(
      analyticsClient.fetchAnalytics({ period: "30d", minMagnitude: null, continent: "world" }),
      (error) => error.code === "INVALID_RESPONSE",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
