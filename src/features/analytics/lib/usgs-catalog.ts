import {
  createAnalyticsWindow,
  toFdsnInclusiveEnd,
  type AnalyticsPeriod,
  type AnalyticsWindow,
} from "./periods";

const FDSN_BASE_URL = "https://earthquake.usgs.gov/fdsnws/event/1";
export const USGS_MAX_PAGE_SIZE = 20_000;
const REQUEST_TIMEOUT_MS = 20_000;

type UnknownRecord = Record<string, unknown>;

export type HistoricalEvent = {
  id: string;
  magnitude: number | null;
  place: string | null;
  coordinates: { longitude: number; latitude: number } | null;
  depthKm: number | null;
  originTime: string;
  updatedAt: string | null;
  url: string | null;
};

type QueryMetadata = {
  sourceMinimumMagnitude: number | null;
  countUrl: string;
  queryUrl: string;
};

type CatalogBaseResult = {
  window: AnalyticsWindow;
  expectedCount: number;
  retrievedCount: number;
  attempts: number;
  query: QueryMetadata;
};

export type HistoricalCatalogResult =
  | (CatalogBaseResult & {
      status: "complete";
      events: HistoricalEvent[];
    })
  | (CatalogBaseResult & {
      status: "incomplete";
      events: [];
    });

export class UsgsCatalogError extends Error {
  readonly code: "SOURCE_UNAVAILABLE" | "INVALID_SOURCE_FEED";

  constructor(code: UsgsCatalogError["code"], message: string) {
    super(message);
    this.name = "UsgsCatalogError";
    this.code = code;
  }
}

type RetrieveOptions = {
  period: AnalyticsPeriod;
  minMagnitude: number | null;
  now?: () => Date;
  fetcher?: typeof fetch;
  pageLimit?: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text.length > 0 ? text : null;
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function epochToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseFeature(feature: unknown): HistoricalEvent | null {
  if (
    !isRecord(feature) ||
    feature.type !== "Feature" ||
    !isRecord(feature.properties)
  ) {
    return null;
  }

  const id = optionalText(feature.id);
  const originTime = epochToIso(feature.properties.time);
  if (!id || !originTime) {
    return null;
  }

  let coordinates: HistoricalEvent["coordinates"] = null;
  let depthKm: number | null = null;
  if (
    isRecord(feature.geometry) &&
    feature.geometry.type === "Point" &&
    Array.isArray(feature.geometry.coordinates)
  ) {
    const [rawLongitude, rawLatitude, rawDepth] = feature.geometry.coordinates;
    depthKm = optionalFiniteNumber(rawDepth);
    if (
      typeof rawLongitude === "number" &&
      Number.isFinite(rawLongitude) &&
      rawLongitude >= -180 &&
      rawLongitude <= 180 &&
      typeof rawLatitude === "number" &&
      Number.isFinite(rawLatitude) &&
      rawLatitude >= -90 &&
      rawLatitude <= 90
    ) {
      coordinates = { longitude: rawLongitude, latitude: rawLatitude };
    }
  }

  const rawUrl = optionalText(feature.properties.url);
  let url: string | null = null;
  if (rawUrl) {
    try {
      const parsedUrl = new URL(rawUrl);
      if (
        parsedUrl.protocol === "https:" &&
        parsedUrl.hostname === "earthquake.usgs.gov"
      ) {
        url = parsedUrl.toString();
      }
    } catch {
      url = null;
    }
  }

  return {
    id,
    magnitude: optionalFiniteNumber(feature.properties.mag),
    place: optionalText(feature.properties.place),
    coordinates,
    depthKm,
    originTime,
    updatedAt: epochToIso(feature.properties.updated),
    url,
  };
}

function parseFeatureCollection(input: unknown): {
  features: unknown[];
  events: HistoricalEvent[];
} {
  if (!isRecord(input) || input.type !== "FeatureCollection" || !Array.isArray(input.features)) {
    throw new UsgsCatalogError(
      "INVALID_SOURCE_FEED",
      "USGS devolvió una página GeoJSON con estructura inválida.",
    );
  }

  const events = input.features
    .map(parseFeature)
    .filter((event): event is HistoricalEvent => event !== null);

  if (input.features.length > 0 && events.length === 0) {
    throw new UsgsCatalogError(
      "INVALID_SOURCE_FEED",
      "USGS devolvió una página con eventos que no tienen los campos esenciales.",
    );
  }

  return { features: input.features, events };
}

function sourceMinimumMagnitude(minMagnitude: number | null): number | null {
  if (minMagnitude === null) {
    return null;
  }

  if (!Number.isFinite(minMagnitude) || minMagnitude < 0) {
    throw new RangeError("La magnitud mínima debe ser un número no negativo.");
  }

  if (minMagnitude < 0.1) {
    return null;
  }

  return Number((minMagnitude - 0.1).toFixed(1));
}

function buildUrl(
  method: "count" | "query",
  window: AnalyticsWindow,
  minimumMagnitude: number | null,
  pageLimit?: number,
  offset?: number,
): URL {
  const url = new URL(FDSN_BASE_URL + "/" + method);
  url.searchParams.set("format", method === "count" ? "text" : "geojson");
  url.searchParams.set("nodata", "204");
  url.searchParams.set("starttime", window.startInclusive);
  url.searchParams.set("endtime", toFdsnInclusiveEnd(window.endExclusive));

  if (minimumMagnitude !== null) {
    url.searchParams.set("minmagnitude", String(minimumMagnitude));
  }

  if (method === "query") {
    url.searchParams.set("orderby", "time-asc");
    url.searchParams.set("limit", String(pageLimit));
    url.searchParams.set("offset", String(offset));
  }

  return url;
}

async function request(
  url: URL,
  fetcher: typeof fetch,
  responseKind: "text" | "json",
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, {
      cache: "no-store",
      headers: {
        Accept: responseKind === "text" ? "text/plain" : "application/geo+json, application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new UsgsCatalogError(
      "SOURCE_UNAVAILABLE",
      "No se pudo consultar el catálogo histórico de USGS.",
    );
  }

  if (response.status === 204) {
    return responseKind === "text"
      ? "0"
      : { type: "FeatureCollection", features: [] };
  }

  if (!response.ok) {
    throw new UsgsCatalogError(
      "SOURCE_UNAVAILABLE",
      "USGS no pudo completar una parte de la consulta histórica.",
    );
  }

  try {
    return responseKind === "text" ? await response.text() : await response.json();
  } catch {
    throw new UsgsCatalogError(
      "INVALID_SOURCE_FEED",
      "USGS devolvió una respuesta que no se pudo interpretar.",
    );
  }
}

function parseExpectedCount(value: unknown): number {
  if (typeof value !== "string" || !/^\s*\d+\s*$/.test(value)) {
    throw new UsgsCatalogError(
      "INVALID_SOURCE_FEED",
      "USGS devolvió una cantidad esperada inválida.",
    );
  }

  const count = Number(value.trim());
  if (!Number.isSafeInteger(count)) {
    throw new UsgsCatalogError(
      "INVALID_SOURCE_FEED",
      "USGS devolvió una cantidad esperada fuera del rango válido.",
    );
  }

  return count;
}

function assertPageLimit(pageLimit: number): void {
  if (
    !Number.isInteger(pageLimit) ||
    pageLimit < 1 ||
    pageLimit > USGS_MAX_PAGE_SIZE
  ) {
    throw new RangeError(
      "El tamaño de página debe estar entre 1 y " + USGS_MAX_PAGE_SIZE + ".",
    );
  }
}

export async function retrieveHistoricalCatalog({
  period,
  minMagnitude,
  now = () => new Date(),
  fetcher = fetch,
  pageLimit = USGS_MAX_PAGE_SIZE,
}: RetrieveOptions): Promise<HistoricalCatalogResult> {
  assertPageLimit(pageLimit);
  const requestedMinimumMagnitude = sourceMinimumMagnitude(minMagnitude);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const window = createAnalyticsWindow(period, now());
    const countUrl = buildUrl("count", window, requestedMinimumMagnitude);
    const expectedCount = parseExpectedCount(
      await request(countUrl, fetcher, "text"),
    );
    const uniqueEvents = new Map<string, HistoricalEvent>();
    const firstQueryUrl = buildUrl(
      "query",
      window,
      requestedMinimumMagnitude,
      pageLimit,
      1,
    );
    const query: QueryMetadata = {
      sourceMinimumMagnitude: requestedMinimumMagnitude,
      countUrl: countUrl.toString(),
      queryUrl: firstQueryUrl.toString(),
    };
    let sourceRecordsRead = 0;
    let offset = 1;

    while (sourceRecordsRead < expectedCount) {
      const pageUrl = buildUrl(
        "query",
        window,
        requestedMinimumMagnitude,
        pageLimit,
        offset,
      );
      let page: ReturnType<typeof parseFeatureCollection>;
      try {
        page = parseFeatureCollection(
          await request(pageUrl, fetcher, "json"),
        );
      } catch (error) {
        if (
          error instanceof UsgsCatalogError &&
          error.code === "SOURCE_UNAVAILABLE"
        ) {
          return {
            status: "incomplete",
            window,
            events: [],
            expectedCount,
            retrievedCount: uniqueEvents.size,
            attempts: attempt,
            query,
          };
        }

        throw error;
      }

      if (page.features.length === 0) {
        break;
      }

      sourceRecordsRead += page.features.length;
      for (const event of page.events) {
        uniqueEvents.set(event.id, event);
      }
      offset += page.features.length;
    }

    const events = [...uniqueEvents.values()];
    if (events.length === expectedCount) {
      return {
        status: "complete",
        window,
        events,
        expectedCount,
        retrievedCount: events.length,
        attempts: attempt,
        query,
      };
    }

    if (attempt === 2) {
      return {
        status: "incomplete",
        window,
        events: [],
        expectedCount,
        retrievedCount: events.length,
        attempts: attempt,
        query,
      };
    }
  }

  throw new Error("La consulta histórica terminó sin resultado.");
}
