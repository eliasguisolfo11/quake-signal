import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const aliases = [
  ["@/features/events/lib/continents", "../src/features/events/lib/continents.ts"],
  ["@/features/events/lib/types", "../src/features/events/lib/types.ts"],
  ["@/features/analytics/lib/periods", "../src/features/analytics/lib/periods.ts"],
  ["@/features/analytics/lib/usgs-catalog", "../src/features/analytics/lib/usgs-catalog.ts"],
  ["@/features/analytics/lib/aggregations", "../src/features/analytics/lib/aggregations.ts"],
  ["@/features/analytics/lib/country-analytics", "../src/features/analytics/lib/country-analytics.ts"],
  ["@/features/analytics/lib/geographic-classification", "../src/features/analytics/lib/geographic-classification.ts"],
];

require.extensions[".ts"] = (loadedModule, filename) => {
  let source = readFileSync(filename, "utf8");
  for (const [alias, relativePath] of aliases) {
    source = source.replaceAll(
      JSON.stringify(alias),
      JSON.stringify(resolve(testDirectory, relativePath)),
    );
  }
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

const { GET } = require(
  resolve(testDirectory, "../src/app/api/v1/analytics/route.ts"),
);
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function eventFeature(id, magnitude, coordinates, time = Date.now() - 60_000) {
  return {
    type: "Feature",
    id,
    properties: {
      mag: magnitude,
      place: "Test place",
      time,
      updated: time + 1000,
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
    },
    geometry: coordinates
      ? { type: "Point", coordinates: [...coordinates, 12] }
      : null,
  };
}

function geoJson(features) {
  return { type: "FeatureCollection", features };
}

function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/geo+json" },
  });
}

function request(query = "") {
  return new Request(`http://localhost/api/v1/analytics${query ? `?${query}` : ""}`);
}

test("validates period, magnitude tenths, and continent before querying USGS", async () => {
  globalThis.fetch = async () => {
    throw new Error("USGS must not be called for invalid filters");
  };

  for (const [query, code] of [
    ["period=90d", "INVALID_PERIOD"],
    ["minMagnitude=1.25", "INVALID_MIN_MAGNITUDE"],
    ["minMagnitude=Infinity", "INVALID_MIN_MAGNITUDE"],
    ["continent=Atlantis", "INVALID_CONTINENT"],
    ["period=30d&period=5y", "INVALID_PERIOD"],
  ]) {
    const response = await GET(request(query));
    const body = await response.json();
    assert.equal(response.status, 400, query);
    assert.equal(body.error.code, code, query);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("returns verified metrics, provenance, and geography for a complete catalog", async () => {
  const requested = [];
  const features = [
    eventFeature("arg-equal", 3.2, [-58.3816, -34.6037]),
    eventFeature("arg-stronger", 4, [-64.1888, -31.4201]),
    eventFeature("ocean", 5, [-30, 0]),
  ];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requested.push(url);
    return url.pathname.endsWith("/count")
      ? new Response("3")
      : jsonResponse(geoJson(features));
  };

  const response = await GET(request("period=30d&minMagnitude=3.2&continent=South%20America"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(body.meta.source, "USGS");
  assert.equal(body.meta.filters.minMagnitude, 3.2);
  assert.equal(body.meta.filters.continent, "South America");
  assert.equal(body.meta.recovery.status, "complete");
  assert.match(body.meta.coverageNote, /no mide la exhaustividad mundial/);
  assert.equal(body.meta.recovery.expectedCount, 3);
  assert.equal(body.meta.recovery.retrievedCount, 3);
  assert.equal(body.meta.recovery.attempts, 1);
  assert.equal(body.meta.query.sourceMinimumMagnitude, 3.1);
  assert.equal(new URL(body.meta.query.firstPageUrl).searchParams.get("minmagnitude"), "3.1");
  assert.equal(body.meta.resultStatus, "available");
  assert.equal(body.data.summary.totalEvents, 2);
  assert.equal(body.data.summary.maximumMagnitude, 4);
  assert.equal(body.data.summary.medianMagnitude, 3.6);
  assert.equal(body.data.geography.groups.find(({ id }) => id === "country:ARG").totalEvents, 2);
  assert.equal(body.data.geography.groups.find(({ id }) => id === "oceanic").totalEvents, 0);
  assert.equal(
    body.data.geography.groups.reduce((total, group) => total + group.totalEvents, 0),
    body.data.summary.totalEvents,
  );
  assert.ok(Number.isFinite(Date.parse(body.meta.requestedAt)));
  assert.ok(Number.isFinite(Date.parse(body.meta.retrievedAt)));
  assert.ok(body.meta.window.startInclusive < body.meta.window.endExclusive);
  assert.equal(body.meta.geography.countries.includes("v5.1.1"), true);
  assert.equal(requested.length, 2);
  assert.ok(requested.every((url) => url.searchParams.get("minmagnitude") === "3.1"));
});

test("distinguishes a valid empty catalog from a complete query with no filter matches", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    return url.pathname.endsWith("/count")
      ? new Response("0")
      : jsonResponse(geoJson([]));
  };

  const empty = await (await GET(request("period=12m"))).json();
  assert.equal(empty.meta.recovery.status, "complete");
  assert.equal(empty.meta.resultStatus, "catalog-empty");
  assert.equal(empty.data.summary.totalEvents, 0);

  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    return url.pathname.endsWith("/count")
      ? new Response("1")
      : jsonResponse(geoJson([
          eventFeature("arg", 3, [-58.3816, -34.6037]),
        ]));
  };

  const noMatches = await (await GET(request("period=12m&continent=Africa"))).json();
  assert.equal(noMatches.meta.recovery.status, "complete");
  assert.equal(noMatches.meta.resultStatus, "no-matches");
  assert.equal(noMatches.data.summary.totalEvents, 0);
});

test("returns no partial analytics when catalog recovery stays incomplete", async () => {
  const calls = [];
  const oneEvent = eventFeature("one", 3, [-58.3816, -34.6037]);
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url.pathname.endsWith("/count") ? "count" : url.searchParams.get("offset"));
    return url.pathname.endsWith("/count")
      ? new Response("2")
      : jsonResponse(geoJson(url.searchParams.get("offset") === "1" ? [oneEvent] : []));
  };

  const response = await GET(request("period=5y"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.meta.recovery.status, "incomplete");
  assert.equal(body.meta.recovery.attempts, 2);
  assert.equal(body.meta.recovery.retrievedCount, 1);
  assert.equal(body.data, null);
  assert.deepEqual(calls, ["count", "1", "2", "count", "1", "2"]);
});

test("reports source failures and invalid source GeoJSON separately", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("offline");
  };
  const unavailable = await GET(request());
  assert.equal(unavailable.status, 502);
  assert.equal((await unavailable.json()).error.code, "SOURCE_UNAVAILABLE");

  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    return url.pathname.endsWith("/count")
      ? new Response("1")
      : jsonResponse({ type: "FeatureCollection", features: "invalid" });
  };
  const invalid = await GET(request());
  assert.equal(invalid.status, 502);
  assert.equal((await invalid.json()).error.code, "INVALID_SOURCE_FEED");
});

test("exposes successful recovery after the catalog adapter's single retry", async () => {
  let countCalls = 0;
  let pageCalls = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/count")) {
      countCalls += 1;
      return new Response(countCalls === 1 ? "2" : "1");
    }
    pageCalls += 1;
    if (countCalls === 1 && url.searchParams.get("offset") === "2") {
      return jsonResponse(geoJson([]));
    }
    return jsonResponse(geoJson([
      eventFeature(`retry-${pageCalls}`, 3, [-58.3816, -34.6037]),
    ]));
  };

  const body = await (await GET(request("period=5y"))).json();
  assert.equal(body.meta.recovery.status, "complete");
  assert.equal(body.meta.recovery.attempts, 2);
  assert.equal(body.meta.recovery.expectedCount, 1);
  assert.equal(body.meta.recovery.retrievedCount, 1);
  assert.equal(countCalls, 2);
  assert.equal(pageCalls, 3);
});

test("accepts negative minimum magnitudes in tenths without asking USGS to filter", async () => {
  const requested = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requested.push(url);
    return url.pathname.endsWith("/count")
      ? new Response("1")
      : jsonResponse(geoJson([
          eventFeature("negative", -0.1, [-58.3816, -34.6037]),
        ]));
  };

  const body = await (await GET(request("minMagnitude=-0.1"))).json();
  assert.equal(body.meta.filters.minMagnitude, -0.1);
  assert.equal(body.data.summary.totalEvents, 1);
  assert.equal(body.data.summary.maximumMagnitude, -0.1);
  assert.equal(body.meta.query.sourceMinimumMagnitude, null);
  assert.equal(requested.some((url) => url.searchParams.has("minmagnitude")), false);
});
