import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const continentModulePath = resolve(
  testDirectory,
  "../src/features/events/lib/continents.ts",
);
require.extensions[".ts"] = (loadedModule, filename) => {
  let source = readFileSync(filename, "utf8");
  source = source.replaceAll(
    '"@/features/events/lib/continents"',
    JSON.stringify(continentModulePath),
  );
  source = source.replaceAll(
    '"@/features/events/lib/types"',
    JSON.stringify(resolve(testDirectory, "../src/features/events/lib/types.ts")),
  );
  source = source.replaceAll(
    '"@/features/events/lib/usgs-feed"',
    JSON.stringify(resolve(testDirectory, "../src/features/events/lib/usgs-feed.ts")),
  );
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
  resolve(testDirectory, "../src/app/api/v1/events/route.ts"),
);
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function readFixture(name) {
  return JSON.parse(
    readFileSync(resolve(testDirectory, "fixtures", name), "utf8"),
  );
}

test("rejects an unsupported period before calling USGS", async () => {
  globalThis.fetch = async () => {
    throw new Error("USGS must not be called for an invalid period");
  };

  const response = await GET(
    new Request("http://localhost/api/v1/events?period=month"),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_PERIOD");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal("events" in body, false);
});

test("returns the common event contract for hour, day, and week feeds", async () => {
  const fixture = await readFixture("partially-invalid.geojson");
  const expectedUrls = {
    hour: "all_hour.geojson",
    day: "all_day.geojson",
    week: "all_week.geojson",
  };

  for (const [period, urlPart] of Object.entries(expectedUrls)) {
    let requestedUrl = "";
    let requestOptions;

    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      requestOptions = init;
      return new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/geo+json" },
      });
    };

    const response = await GET(
      new Request("http://localhost/api/v1/events?period=" + period),
    );
    const body = await response.json();

    assert.equal(response.status, 200, period);
    assert.ok(requestedUrl.endsWith(urlPart), period);
    assert.equal(requestOptions.cache, "no-store", period);
    assert.equal(response.headers.get("cache-control"), "no-store", period);
    assert.equal(body.source, "USGS", period);
    assert.equal(body.period, period);
    assert.equal(body.generatedAt, "2026-01-01T00:00:00.000Z");
    assert.ok(Number.isFinite(Date.parse(body.receivedAt)));
    assert.equal(body.events.length, 2);
    assert.equal(body.events[0].continent, "North America");
    assert.equal(body.events[1].continent, null);
  }
});

test("returns a recoverable source error when the network request fails", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Network unavailable");
  };

  const response = await GET(
    new Request("http://localhost/api/v1/events?period=day"),
  );
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.error.code, "SOURCE_UNAVAILABLE");
  assert.equal("events" in body, false);
});

test("returns a recoverable source error when USGS responds with a failure status", async () => {
  globalThis.fetch = async () => new Response("", { status: 503 });

  const response = await GET(
    new Request("http://localhost/api/v1/events?period=week"),
  );
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.error.code, "SOURCE_UNAVAILABLE");
  assert.equal("events" in body, false);
});

test("does not turn an entirely invalid USGS feed into empty results", async () => {
  const fixture = await readFixture("all-invalid.geojson");
  globalThis.fetch = async () =>
    new Response(JSON.stringify(fixture), {
      status: 200,
      headers: { "Content-Type": "application/geo+json" },
    });

  const response = await GET(
    new Request("http://localhost/api/v1/events?period=day"),
  );
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.error.code, "INVALID_SOURCE_FEED");
  assert.equal("events" in body, false);
});