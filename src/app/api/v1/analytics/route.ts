import { classifyContinent } from "@/features/events/lib/continents";
import { CONTINENTS, type Continent } from "@/features/events/lib/types";
import { aggregateAnalytics } from "@/features/analytics/lib/aggregations";
import { aggregateGeography } from "@/features/analytics/lib/country-analytics";
import type {
  AnalyticsFilters,
  AnalyticsSuccessResponse,
} from "@/features/analytics/lib/contracts";
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
} from "@/features/analytics/lib/periods";
import {
  retrieveHistoricalCatalog,
  UsgsCatalogError,
  USGS_MAX_PAGE_SIZE,
} from "@/features/analytics/lib/usgs-catalog";
import { GEOGRAPHIC_DATA_VERSION } from "@/features/analytics/lib/geographic-classification";

const NO_STORE = { "Cache-Control": "no-store" };
const USGS_QUERY_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const COVERAGE_NOTE =
  "El estado indica si se completó la consulta a USGS; no mide la exhaustividad mundial del catálogo.";

class InvalidAnalyticsRequest extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "InvalidAnalyticsRequest";
  }
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: NO_STORE },
  );
}

function readSingleParameter(
  searchParams: URLSearchParams,
  name: string,
): string | null {
  const values = searchParams.getAll(name);
  if (values.length > 1) {
    throw new InvalidAnalyticsRequest(
      name === "period" ? "INVALID_PERIOD" : "INVALID_FILTER",
      `El parámetro ${name} no se puede repetir.`,
    );
  }

  return values[0] ?? null;
}

function parseFilters(searchParams: URLSearchParams): AnalyticsFilters {
  const requestedPeriod = readSingleParameter(searchParams, "period") ?? "30d";
  if (!ANALYTICS_PERIODS.includes(requestedPeriod as AnalyticsPeriod)) {
    throw new InvalidAnalyticsRequest(
      "INVALID_PERIOD",
      "Elegí 30 días, 12 meses o 5 años para consultar el análisis.",
    );
  }

  const requestedMagnitude = readSingleParameter(searchParams, "minMagnitude");
  let minMagnitude: number | null = null;
  if (requestedMagnitude !== null) {
    const trimmedMagnitude = requestedMagnitude.trim();
    const parsedMagnitude = Number(trimmedMagnitude);
    const tenths = parsedMagnitude * 10;
    const nearestTenth = Math.round(tenths);
    if (
      trimmedMagnitude.length === 0 ||
      trimmedMagnitude.length > 64 ||
      !Number.isFinite(parsedMagnitude) ||
      !Number.isSafeInteger(nearestTenth) ||
      Math.abs(tenths - nearestTenth) > 1e-8
    ) {
      throw new InvalidAnalyticsRequest(
        "INVALID_MIN_MAGNITUDE",
        "La magnitud mínima debe ser un número en incrementos de 0,1.",
      );
    }
    minMagnitude = nearestTenth / 10;
  }

  const requestedContinent = readSingleParameter(searchParams, "continent") ?? "world";
  if (
    requestedContinent !== "world" &&
    !CONTINENTS.includes(requestedContinent as Continent)
  ) {
    throw new InvalidAnalyticsRequest(
      "INVALID_CONTINENT",
      "Elegí Todo el mundo o un continente disponible.",
    );
  }

  return {
    period: requestedPeriod as AnalyticsPeriod,
    minMagnitude,
    continent: requestedContinent as Continent | "world",
  };
}

function filterContinent(
  events: Parameters<typeof aggregateAnalytics>[0],
  continent: AnalyticsFilters["continent"],
) {
  if (continent === "world") {
    return events;
  }

  return events.filter(
    (event) => classifyContinent(event.coordinates) === continent,
  );
}

export async function GET(request: Request): Promise<Response> {
  let filters: AnalyticsFilters;
  try {
    filters = parseFilters(new URL(request.url).searchParams);
  } catch (error) {
    if (error instanceof InvalidAnalyticsRequest) {
      return errorResponse(400, error.code, error.message);
    }
    return errorResponse(400, "INVALID_FILTER", "Los filtros de análisis no son válidos.");
  }

  const requestedAt = new Date().toISOString();
  try {
    const catalog = await retrieveHistoricalCatalog({
      period: filters.period,
      minMagnitude: filters.minMagnitude,
    });
    const retrievedAt = new Date().toISOString();
    const baseMeta = {
      source: "USGS" as const,
      sourceUrl: USGS_QUERY_URL,
      period: filters.period,
      filters: {
        minMagnitude: filters.minMagnitude,
        continent: filters.continent,
      },
      window: catalog.window,
      requestedAt,
      retrievedAt,
      coverageNote: COVERAGE_NOTE,
      recovery: {
        status: catalog.status,
        expectedCount: catalog.expectedCount,
        retrievedCount: catalog.retrievedCount,
        attempts: catalog.attempts,
      },
      query: {
        countUrl: catalog.query.countUrl,
        firstPageUrl: catalog.query.queryUrl,
        sourceMinimumMagnitude: catalog.query.sourceMinimumMagnitude,
        pageLimit: USGS_MAX_PAGE_SIZE,
      },
      geography: GEOGRAPHIC_DATA_VERSION,
    };

    if (catalog.status === "incomplete") {
      const body: AnalyticsSuccessResponse = {
        data: null,
        meta: { ...baseMeta, resultStatus: "incomplete" },
      };
      return Response.json(body, { headers: NO_STORE });
    }

    const regionEvents = filterContinent(catalog.events, filters.continent);
    const aggregate = aggregateAnalytics(regionEvents, {
      period: filters.period,
      window: catalog.window,
      minMagnitude: filters.minMagnitude,
    });
    const { events, ...summary } = aggregate;
    const geography = aggregateGeography(events, {
      period: filters.period,
      window: catalog.window,
    });
    const resultStatus = catalog.expectedCount === 0
      ? "catalog-empty"
      : aggregate.totalEvents === 0
        ? "no-matches"
        : "available";
    const body: AnalyticsSuccessResponse = {
      data: { summary, geography },
      meta: { ...baseMeta, resultStatus },
    };

    return Response.json(body, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof UsgsCatalogError) {
      return errorResponse(
        502,
        error.code,
        error.code === "INVALID_SOURCE_FEED"
          ? "USGS devolvió datos que no se pudieron validar. Podés intentarlo de nuevo."
          : "USGS no pudo completar la consulta histórica. Podés intentarlo de nuevo.",
      );
    }
    if (error instanceof RangeError) {
      return errorResponse(400, "INVALID_FILTER", "Los filtros de análisis no son válidos.");
    }

    return errorResponse(
      500,
      "ANALYTICS_FAILED",
      "No se pudo completar el análisis. Intentá de nuevo más tarde.",
    );
  }
}
