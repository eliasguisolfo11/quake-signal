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

const periods = require(
  resolve(testDirectory, "../src/features/analytics/lib/periods.ts"),
);
const catalog = require(
  resolve(testDirectory, "../src/features/analytics/lib/usgs-catalog.ts"),
);

function eventFeature(id, time, magnitude = 3.2, coordinates = [-72, -35, 10]) {
  return {
    type: "Feature",
    id,
    properties: {
      mag: magnitude,
      place: "Test location",
      time,
      updated: time + 1000,
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/" + id,
    },
    geometry: { type: "Point", coordinates },
  };
}

function featureCollection(features) {
  return { type: "FeatureCollection", features };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/geo+json" },
  });
}

test("creates exact UTC windows and translates the exclusive end to FDSN", () => {
  const now = new Date("2024-02-29T12:00:00.000Z");
  const thirtyDays = periods.createAnalyticsWindow("30d", now);
  const twelveMonths = periods.createAnalyticsWindow("12m", now);
  const fiveYears = periods.createAnalyticsWindow("5y", now);

  assert.deepEqual(thirtyDays, {
    startInclusive: "2024-01-30T12:00:00.000Z",
    endExclusive: "2024-02-29T12:00:00.000Z",
  });
  assert.deepEqual(twelveMonths, {
    startInclusive: "2023-02-28T12:00:00.000Z",
    endExclusive: "2024-02-29T12:00:00.000Z",
  });
  assert.deepEqual(fiveYears, {
    startInclusive: "2019-02-28T12:00:00.000Z",
    endExclusive: "2024-02-29T12:00:00.000Z",
  });
  assert.equal(
    periods.toFdsnInclusiveEnd(twelveMonths.endExclusive),
    "2024-02-29T11:59:59.999Z",
  );
});

test("queries the USGS minimum one magnitude step below the inclusive threshold", async () => {
  const requested = [];
  const result = await catalog.retrieveHistoricalCatalog({
    period: "30d",
    minMagnitude: 3.2,
    now: () => new Date("2024-03-01T00:00:00.000Z"),
    pageLimit: 2,
    fetcher: async (input) => {
      const url = new URL(String(input));
      requested.push(url);
      return url.pathname.endsWith("/count")
        ? new Response("0")
        : jsonResponse(featureCollection([]));
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.expectedCount, 0);
  assert.equal(result.retrievedCount, 0);
  assert.equal(result.query.sourceMinimumMagnitude, 3.1);
  assert.equal(requested.length, 1);
  assert.equal(requested[0].searchParams.get("minmagnitude"), "3.1");
  assert.equal(requested[0].searchParams.get("starttime"), "2024-01-31T00:00:00.000Z");
  assert.equal(requested[0].searchParams.get("endtime"), "2024-02-29T23:59:59.999Z");
});

test("retrieves every page, deduplicates IDs, and preserves missing values", async () => {
  const requested = [];
  const events = [
    eventFeature("event-1", Date.parse("2024-02-01T00:00:00.000Z"), null, [-72, -35, null]),
    eventFeature("event-2", Date.parse("2024-02-02T00:00:00.000Z")),
    eventFeature("event-3", Date.parse("2024-02-03T00:00:00.000Z")),
  ];

  const result = await catalog.retrieveHistoricalCatalog({
    period: "30d",
    minMagnitude: null,
    now: () => new Date("2024-03-01T00:00:00.000Z"),
    pageLimit: 2,
    fetcher: async (input) => {
      const url = new URL(String(input));
      requested.push(url);
      if (url.pathname.endsWith("/count")) return new Response("3");

      const offset = Number(url.searchParams.get("offset"));
      const features = offset === 1 ? [events[0], events[1]] : [events[2]];
      return jsonResponse(featureCollection(features));
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.expectedCount, 3);
  assert.equal(result.retrievedCount, 3);
  assert.deepEqual(result.events.map((event) => event.id), ["event-1", "event-2", "event-3"]);
  assert.equal(result.events[0].magnitude, null);
  assert.equal(result.events[0].depthKm, null);
  assert.equal(result.events[0].coordinates.longitude, -72);
  assert.equal(requested.filter((url) => url.pathname.endsWith("/query")).length, 2);
  assert.deepEqual(
    requested
      .filter((url) => url.pathname.endsWith("/query"))
      .map((url) => [url.searchParams.get("limit"), url.searchParams.get("offset")]),
    [["2", "1"], ["2", "3"]],
  );
});

test("retries one count mismatch with a new UTC cutoff and discards the partial attempt", async () => {
  const requested = [];
  let attempt = 0;
  const firstEvents = [
    eventFeature("event-1", Date.parse("2024-02-01T00:00:00.000Z")),
    eventFeature("event-2", Date.parse("2024-02-02T00:00:00.000Z")),
  ];

  const result = await catalog.retrieveHistoricalCatalog({
    period: "12m",
    minMagnitude: null,
    now: (() => {
      const instants = [
        new Date("2024-03-01T00:00:00.000Z"),
        new Date("2024-03-02T00:00:00.000Z"),
      ];
      return () => instants.shift();
    })(),
    pageLimit: 2,
    fetcher: async (input) => {
      const url = new URL(String(input));
      requested.push(url);
      if (url.pathname.endsWith("/count")) {
        attempt += 1;
        return new Response("3");
      }

      const offset = Number(url.searchParams.get("offset"));
      if (attempt === 1) {
        return jsonResponse(featureCollection(offset === 1 ? firstEvents : [firstEvents[1]]));
      }
      return jsonResponse(
        featureCollection(
          offset === 1
            ? firstEvents
            : [eventFeature("event-3", Date.parse("2024-02-03T00:00:00.000Z"))],
        ),
      );
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.attempts, 2);
  assert.deepEqual(result.events.map((event) => event.id), ["event-1", "event-2", "event-3"]);
  const queryStartTimes = requested
    .filter((url) => url.pathname.endsWith("/query"))
    .map((url) => url.searchParams.get("starttime"));
  assert.ok(queryStartTimes.every((value) => value === "2023-03-01T00:00:00.000Z" || value === "2023-03-02T00:00:00.000Z"));
  assert.ok(queryStartTimes.includes("2023-03-01T00:00:00.000Z"));
  assert.ok(queryStartTimes.includes("2023-03-02T00:00:00.000Z"));
});

test("returns no partial catalog when the retry still disagrees with the count", async () => {
  let countCalls = 0;
  const result = await catalog.retrieveHistoricalCatalog({
    period: "30d",
    minMagnitude: null,
    now: () => new Date("2024-03-01T00:00:00.000Z"),
    pageLimit: 2,
    fetcher: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/count")) {
        countCalls += 1;
        return new Response("2");
      }
      return jsonResponse(
        featureCollection([
          eventFeature("event-" + countCalls, Date.parse("2024-02-01T00:00:00.000Z")),
        ]),
      );
    },
  });

  assert.equal(result.status, "incomplete");
  assert.equal(result.attempts, 2);
  assert.equal(result.expectedCount, 2);
  assert.equal(result.retrievedCount, 1);
  assert.deepEqual(result.events, []);
});

test("distinguishes an invalid count response from a valid empty catalog", async () => {
  await assert.rejects(
    catalog.retrieveHistoricalCatalog({
      period: "30d",
      minMagnitude: null,
      now: () => new Date("2024-03-01T00:00:00.000Z"),
      fetcher: async () => new Response("not a count"),
    }),
    catalog.UsgsCatalogError,
  );
});

test("treats the documented no-data count status as a valid empty catalog", async () => {
  let requests = 0;
  const result = await catalog.retrieveHistoricalCatalog({
    period: "30d",
    minMagnitude: null,
    now: () => new Date("2024-03-01T00:00:00.000Z"),
    fetcher: async () => {
      requests += 1;
      return new Response(null, { status: 204 });
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.expectedCount, 0);
  assert.equal(result.retrievedCount, 0);
  assert.deepEqual(result.events, []);
  assert.equal(requests, 1);
});

test("retries an empty page after a nonzero count before reporting completeness", async () => {
  let countCalls = 0;
  let queryCalls = 0;
  const result = await catalog.retrieveHistoricalCatalog({
    period: "30d",
    minMagnitude: null,
    now: () => new Date("2024-03-01T00:00:00.000Z"),
    pageLimit: 2,
    fetcher: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/count")) {
        countCalls += 1;
        return new Response("1");
      }

      queryCalls += 1;
      return queryCalls === 1
        ? new Response(null, { status: 204 })
        : jsonResponse(
            featureCollection([
              eventFeature("event-1", Date.parse("2024-02-01T00:00:00.000Z")),
            ]),
          );
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.attempts, 2);
  assert.equal(result.retrievedCount, 1);
  assert.equal(result.events[0].id, "event-1");
  assert.equal(countCalls, 2);
});

test("preserves a valid depth when epicenter coordinates are invalid", async () => {
  const result = await catalog.retrieveHistoricalCatalog({
    period: "30d",
    minMagnitude: null,
    now: () => new Date("2024-03-01T00:00:00.000Z"),
    fetcher: async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/count")
        ? new Response("1")
        : jsonResponse(
            featureCollection([
              eventFeature(
                "event-invalid-location",
                Date.parse("2024-02-01T00:00:00.000Z"),
                2.4,
                [181, -35, 44],
              ),
            ]),
          );
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.events[0].coordinates, null);
  assert.equal(result.events[0].depthKm, 44);
});

test("returns an incomplete query without exposing partial events when a page fails", async () => {
  let countCalls = 0;
  const result = await catalog.retrieveHistoricalCatalog({
    period: "30d",
    minMagnitude: null,
    now: () => new Date("2024-03-01T00:00:00.000Z"),
    fetcher: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/count")) {
        countCalls += 1;
        return new Response("1");
      }
      return new Response("unavailable", { status: 503 });
    },
  });

  assert.equal(result.status, "incomplete");
  assert.equal(result.expectedCount, 1);
  assert.equal(result.retrievedCount, 0);
  assert.equal(result.attempts, 1);
  assert.deepEqual(result.events, []);
  assert.equal(countCalls, 1);
});
