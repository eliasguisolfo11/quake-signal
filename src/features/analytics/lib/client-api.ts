import { CONTINENTS, type Continent } from "@/features/events/lib/types";
import type {
  AnalyticsFilters,
  AnalyticsSuccessResponse,
  AnalyticsResultStatus,
} from "./contracts";
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "./periods";

export type MagnitudeInputResult = {
  value: number | null;
  error: string | null;
};

export class AnalyticsApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "AnalyticsApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseMinimumMagnitudeInput(input: string): MagnitudeInputResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { value: null, error: null };
  }

  if (trimmed.length > 64 || !/^-?\d+(?:[.,]\d+)?$/.test(trimmed)) {
    return {
      value: null,
      error: "La magnitud mínima debe ser un número en incrementos de 0,1.",
    };
  }

  const parsed = Number(trimmed.replace(",", "."));
  const tenths = parsed * 10;
  const roundedTenths = Math.round(tenths);
  if (
    !Number.isFinite(parsed) ||
    !Number.isSafeInteger(roundedTenths) ||
    Math.abs(tenths - roundedTenths) > 1e-8
  ) {
    return {
      value: null,
      error: "La magnitud mínima debe usar incrementos de 0,1.",
    };
  }

  return { value: roundedTenths / 10, error: null };
}

export function parseAnalyticsFilters(searchParams: URLSearchParams): AnalyticsFilters {
  const periodValue = searchParams.get("period");
  const period = ANALYTICS_PERIODS.includes(periodValue as AnalyticsPeriod)
    ? (periodValue as AnalyticsPeriod)
    : "30d";
  const magnitude = parseMinimumMagnitudeInput(searchParams.get("minMagnitude") ?? "");
  const continentValue = searchParams.get("continent");
  const continent = continentValue === "world" || CONTINENTS.includes(continentValue as Continent)
    ? (continentValue as Continent | "world")
    : "world";

  return {
    period,
    minMagnitude: magnitude.error ? null : magnitude.value,
    continent,
  };
}

export function serializeAnalyticsFilters(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  if (filters.minMagnitude !== null) {
    params.set("minMagnitude", String(filters.minMagnitude));
  }
  params.set("continent", filters.continent);
  return params.toString();
}

export function buildAnalyticsRequestUrl(filters: AnalyticsFilters): string {
  return `/api/v1/analytics?${serializeAnalyticsFilters(filters)}`;
}

function isResultStatus(value: unknown): value is AnalyticsResultStatus {
  return value === "available" ||
    value === "catalog-empty" ||
    value === "no-matches" ||
    value === "incomplete";
}

function isValidAnalyticsResponse(value: unknown): value is AnalyticsSuccessResponse {
  if (!isRecord(value) || !isRecord(value.meta)) {
    return false;
  }

  const { meta, data } = value;
  const recovery = meta.recovery;
  const window = meta.window;
  const query = meta.query;
  const filters = meta.filters;
  if (
    meta.source !== "USGS" ||
    !ANALYTICS_PERIODS.includes(meta.period as AnalyticsPeriod) ||
    !isResultStatus(meta.resultStatus) ||
    !isRecord(recovery) ||
    (recovery.status !== "complete" && recovery.status !== "incomplete") ||
    !Number.isSafeInteger(recovery.expectedCount) ||
    !Number.isSafeInteger(recovery.retrievedCount) ||
    !Number.isSafeInteger(recovery.attempts) ||
    !isRecord(window) ||
    typeof window.startInclusive !== "string" ||
    typeof window.endExclusive !== "string" ||
    !isRecord(query) ||
    typeof query.firstPageUrl !== "string" ||
    !isRecord(filters) ||
    (filters.minMagnitude !== null && typeof filters.minMagnitude !== "number") ||
    typeof filters.continent !== "string"
  ) {
    return false;
  }

  if (meta.resultStatus === "incomplete") {
    return data === null && recovery.status === "incomplete";
  }

  return (
    recovery.status === "complete" &&
    isRecord(data) &&
    isRecord(data.summary) &&
    Number.isSafeInteger(data.summary.totalEvents) &&
    Array.isArray(data.summary.timeSeries) &&
    Array.isArray(data.summary.magnitudeDistribution) &&
    Array.isArray(data.summary.depthDistribution) &&
    isRecord(data.geography) &&
    Number.isSafeInteger(data.geography.totalEvents) &&
    Array.isArray(data.geography.groups)
  );
}

export async function fetchAnalytics(
  filters: AnalyticsFilters,
  signal?: AbortSignal,
): Promise<AnalyticsSuccessResponse> {
  let response: Response;
  try {
    response = await fetch(buildAnalyticsRequestUrl(filters), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new AnalyticsApiError(
      "No se pudo conectar con el análisis. Revisá la conexión e intentá de nuevo.",
      "SOURCE_UNAVAILABLE",
      null,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AnalyticsApiError(
      "El análisis devolvió una respuesta que no se pudo leer.",
      "INVALID_RESPONSE",
      response.status,
    );
  }

  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : null;
    throw new AnalyticsApiError(
      typeof error?.message === "string"
        ? error.message
        : "No se pudo completar el análisis. Intentá de nuevo.",
      typeof error?.code === "string" ? error.code : "ANALYTICS_FAILED",
      response.status,
    );
  }

  if (!isValidAnalyticsResponse(body)) {
    throw new AnalyticsApiError(
      "El análisis devolvió datos con un formato no válido.",
      "INVALID_RESPONSE",
      response.status,
    );
  }

  return body;
}
