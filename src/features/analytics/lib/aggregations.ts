import {
  MAGNITUDE_BANDS,
  magnitudeBandKey,
} from "../../events/lib/event-filters";
import type { AnalyticsPeriod, AnalyticsWindow } from "./periods";
import type { HistoricalEvent } from "./usgs-catalog";

export type CountBucket = {
  bucketStart: string;
  count: number;
};

export type DistributionBucket = {
  key: string;
  label: string;
  count: number;
};

export type AnalyticsAggregate = {
  events: HistoricalEvent[];
  totalEvents: number;
  maximumMagnitude: number | null;
  medianMagnitude: number | null;
  eventsWithMagnitude: number;
  eventsWithoutMagnitude: number;
  timeSeries: CountBucket[];
  magnitudeDistribution: DistributionBucket[];
  depthDistribution: DistributionBucket[];
};

type AggregateOptions = {
  period: AnalyticsPeriod;
  window: AnalyticsWindow;
  minMagnitude: number | null;
};

const DEPTH_BANDS = [
  { key: "shallow", label: "Somera (0–70 km)" },
  { key: "intermediate", label: "Intermedia (>70–300 km)" },
  { key: "deep", label: "Profunda (>300 km)" },
  { key: "outside-standard", label: "Fuera de las clases estándar" },
  { key: "unknown", label: "Sin dato" },
] as const;

function normalizeWindow(window: AnalyticsWindow): {
  start: number;
  end: number;
} {
  const start = Date.parse(window.startInclusive);
  const end = Date.parse(window.endExclusive);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new RangeError("El intervalo temporal de análisis no es válido.");
  }

  return { start, end };
}

function normalizeEvents(
  events: HistoricalEvent[],
  start: number,
  end: number,
): HistoricalEvent[] {
  const uniqueEvents = new Map<string, HistoricalEvent>();

  for (const event of events) {
    if (typeof event.id !== "string" || event.id.trim().length === 0) {
      continue;
    }

    const originTime = Date.parse(event.originTime);
    if (!Number.isFinite(originTime) || originTime < start || originTime >= end) {
      continue;
    }

    if (uniqueEvents.has(event.id)) {
      continue;
    }

    uniqueEvents.set(event.id, {
      ...event,
      magnitude:
        typeof event.magnitude === "number" && Number.isFinite(event.magnitude)
          ? event.magnitude
          : null,
      depthKm:
        typeof event.depthKm === "number" && Number.isFinite(event.depthKm)
          ? event.depthKm
          : null,
    });
  }

  return [...uniqueEvents.values()];
}

function filterByMagnitude(
  events: HistoricalEvent[],
  minMagnitude: number | null,
): HistoricalEvent[] {
  if (minMagnitude === null) {
    return events;
  }

  if (!Number.isFinite(minMagnitude) || minMagnitude < 0) {
    throw new RangeError("La magnitud mínima debe ser un número no negativo.");
  }

  return events.filter(
    (event) => event.magnitude !== null && event.magnitude >= minMagnitude,
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function bucketStart(timestamp: number, period: AnalyticsPeriod): Date {
  const date = new Date(timestamp);
  if (period === "30d") {
    date.setUTCHours(0, 0, 0, 0);
  } else {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
  }

  return date;
}

function nextBucket(date: Date, period: AnalyticsPeriod): Date {
  const next = new Date(date);
  if (period === "30d") {
    next.setUTCDate(next.getUTCDate() + 1);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }

  return next;
}

function buildTimeSeries(
  events: HistoricalEvent[],
  period: AnalyticsPeriod,
  start: number,
  end: number,
): CountBucket[] {
  const buckets = new Map<string, number>();
  const firstBucket = bucketStart(start, period);

  for (
    let cursor = firstBucket;
    cursor.getTime() < end;
    cursor = nextBucket(cursor, period)
  ) {
    buckets.set(cursor.toISOString(), 0);
  }

  for (const event of events) {
    const originTime = Date.parse(event.originTime);
    const key = bucketStart(originTime, period).toISOString();
    const existing = buckets.get(key);
    if (existing !== undefined) {
      buckets.set(key, existing + 1);
    }
  }

  return [...buckets].map(([bucketStartValue, count]) => ({
    bucketStart: bucketStartValue,
    count,
  }));
}

function buildMagnitudeDistribution(
  events: HistoricalEvent[],
  includeUnknown: boolean,
): DistributionBucket[] {
  const counts = new Map<string, number>();
  for (const band of MAGNITUDE_BANDS) {
    counts.set(band.key, 0);
  }
  if (includeUnknown) {
    counts.set("unknown", 0);
  }

  for (const event of events) {
    if (event.magnitude === null) {
      if (includeUnknown) {
        counts.set("unknown", (counts.get("unknown") ?? 0) + 1);
      }
      continue;
    }

    const key = magnitudeBandKey(event.magnitude);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets: DistributionBucket[] = MAGNITUDE_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    count: counts.get(band.key) ?? 0,
  }));

  if (includeUnknown) {
    buckets.push({
      key: "unknown",
      label: "Sin dato",
      count: counts.get("unknown") ?? 0,
    });
  }

  return buckets;
}

function depthBandKey(depthKm: number | null): string {
  if (depthKm === null) {
    return "unknown";
  }
  if (depthKm < 0 || depthKm > 700) {
    return "outside-standard";
  }
  if (depthKm <= 70) {
    return "shallow";
  }
  if (depthKm <= 300) {
    return "intermediate";
  }
  return "deep";
}

function buildDepthDistribution(events: HistoricalEvent[]): DistributionBucket[] {
  const counts = new Map<string, number>(
    DEPTH_BANDS.map((band) => [band.key, 0]),
  );

  for (const event of events) {
    const key = depthBandKey(event.depthKm);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return DEPTH_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    count: counts.get(band.key) ?? 0,
  }));
}

export function aggregateAnalytics(
  inputEvents: HistoricalEvent[],
  options: AggregateOptions,
): AnalyticsAggregate {
  const { start, end } = normalizeWindow(options.window);
  const candidates = normalizeEvents(inputEvents, start, end);
  const events = filterByMagnitude(candidates, options.minMagnitude);
  const magnitudes = events
    .map((event) => event.magnitude)
    .filter((magnitude): magnitude is number => magnitude !== null);
  let maximumMagnitude: number | null = null;
  for (const magnitude of magnitudes) {
    if (maximumMagnitude === null || magnitude > maximumMagnitude) {
      maximumMagnitude = magnitude;
    }
  }

  return {
    events,
    totalEvents: events.length,
    maximumMagnitude,
    medianMagnitude: median(magnitudes),
    eventsWithMagnitude: magnitudes.length,
    eventsWithoutMagnitude: events.length - magnitudes.length,
    timeSeries: buildTimeSeries(events, options.period, start, end),
    magnitudeDistribution: buildMagnitudeDistribution(
      events,
      options.minMagnitude === null,
    ),
    depthDistribution: buildDepthDistribution(events),
  };
}
