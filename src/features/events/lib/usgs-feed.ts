import type { EventPeriod, QuakeEvent } from "./types";

const FEED_URLS: Record<EventPeriod, string> = {
  hour: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
  day: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  week: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
};

type UnknownRecord = Record<string, unknown>;

export class UsgsFeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsgsFeedError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function epochToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text.length > 0 ? text : null;
}

function safeUsgsUrl(value: unknown): string | null {
  const text = optionalText(value);
  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    return url.protocol === "https:" && url.hostname === "earthquake.usgs.gov"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function readCoordinates(geometry: unknown): {
  coordinates: QuakeEvent["coordinates"];
  depthKm: number | null;
} {
  if (!isRecord(geometry) || geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) {
    return { coordinates: null, depthKm: null };
  }

  const [longitude, latitude, depth] = geometry.coordinates;
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return { coordinates: null, depthKm: null };
  }

  return {
    coordinates: { longitude, latitude },
    depthKm: optionalFiniteNumber(depth),
  };
}

function readEvent(feature: unknown): QuakeEvent | null {
  if (!isRecord(feature) || feature.type !== "Feature" || !isRecord(feature.properties)) {
    return null;
  }

  const id = optionalText(feature.id);
  const originTime = epochToIso(feature.properties.time);
  if (!id || !originTime) {
    return null;
  }

  const { coordinates, depthKm } = readCoordinates(feature.geometry);

  return {
    id,
    magnitude: optionalFiniteNumber(feature.properties.mag),
    place: optionalText(feature.properties.place),
    coordinates,
    depthKm,
    originTime,
    updatedAt: epochToIso(feature.properties.updated),
    alert: optionalText(feature.properties.alert),
    url: safeUsgsUrl(feature.properties.url),
    continent: null,
  };
}

export function getUsgsFeedUrl(period: EventPeriod): string {
  return FEED_URLS[period];
}

export function parseUsgsFeed(input: unknown): {
  generatedAt: string;
  events: QuakeEvent[];
} {
  if (!isRecord(input) || input.type !== "FeatureCollection" || !isRecord(input.metadata)) {
    throw new UsgsFeedError("La estructura del feed GeoJSON no es válida.");
  }

  const generatedAt = epochToIso(input.metadata.generated);
  if (!generatedAt || !Array.isArray(input.features)) {
    throw new UsgsFeedError("El feed no contiene metadatos de generación o eventos válidos.");
  }

  if (typeof input.metadata.status === "number" && input.metadata.status >= 400) {
    throw new UsgsFeedError("USGS informó un error en los metadatos del feed.");
  }

  const events = input.features
    .map(readEvent)
    .filter((event): event is QuakeEvent => event !== null);

  if (input.features.length > 0 && events.length === 0) {
    throw new UsgsFeedError("El feed contiene eventos, pero ninguno tiene datos esenciales válidos.");
  }

  return { generatedAt, events };
}
