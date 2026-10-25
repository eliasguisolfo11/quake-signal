import { buildTimeSeries, type CountBucket } from "./aggregations";
import type { AnalyticsPeriod, AnalyticsWindow } from "./periods";
import {
  classifyEpicenter,
  listAnalyticsCountries,
  type EpicenterAssignment,
  type EpicenterClassifier,
} from "./geographic-classification";
import type { HistoricalEvent } from "./usgs-catalog";

export type UnassignedGeographyKind = Exclude<EpicenterAssignment["kind"], "country">;

export type CountryGroup = {
  kind: "country";
  id: string;
  countryId: string;
  name: string;
  continent: string;
  totalEvents: number;
  timeSeries: CountBucket[];
  strongestEvents: HistoricalEvent[];
  recentEvents: HistoricalEvent[];
};

export type UnassignedGroup = {
  kind: UnassignedGeographyKind;
  id: UnassignedGeographyKind;
  label: string;
  totalEvents: number;
  timeSeries: CountBucket[];
};

export type GeographicGroup = CountryGroup | UnassignedGroup;

export type GeographicAggregate = {
  totalEvents: number;
  groups: GeographicGroup[];
};

type AggregateOptions = {
  period: AnalyticsPeriod;
  window: AnalyticsWindow;
};

type MutableCountryGroup = {
  kind: "country";
  id: string;
  countryId: string;
  name: string;
  continent: string;
  events: HistoricalEvent[];
};

type MutableUnassignedGroup = {
  kind: UnassignedGeographyKind;
  id: UnassignedGeographyKind;
  label: string;
  events: HistoricalEvent[];
};

type MutableGroup = MutableCountryGroup | MutableUnassignedGroup;

const UNASSIGNED_GROUPS: Array<{
  kind: UnassignedGeographyKind;
  label: string;
}> = [
  { kind: "oceanic", label: "Oceánico" },
  { kind: "land-unassigned", label: "Tierra sin país asignado" },
  { kind: "border-overlap", label: "Sin asignar por frontera/solapamiento" },
  { kind: "no-coordinates", label: "Sin coordenadas" },
];

const ANALYTICS_COUNTRIES = listAnalyticsCountries();

function compareIds(first: string, second: string): number {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

function compareOriginNewestFirst(
  first: HistoricalEvent,
  second: HistoricalEvent,
): number {
  return (
    Date.parse(second.originTime) - Date.parse(first.originTime) ||
    compareIds(first.id, second.id)
  );
}

function compareMagnitudeHighestFirst(
  first: HistoricalEvent,
  second: HistoricalEvent,
): number {
  return (
    (second.magnitude ?? Number.NEGATIVE_INFINITY) -
      (first.magnitude ?? Number.NEGATIVE_INFINITY) ||
    compareOriginNewestFirst(first, second)
  );
}

function normalizeEvents(
  events: HistoricalEvent[],
  window: AnalyticsWindow,
): HistoricalEvent[] {
  const start = Date.parse(window.startInclusive);
  const end = Date.parse(window.endExclusive);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new RangeError("El intervalo temporal de análisis no es válido.");
  }

  const unique = new Map<string, HistoricalEvent>();
  for (const event of events) {
    if (typeof event.id !== "string" || event.id.trim().length === 0) {
      continue;
    }
    const origin = Date.parse(event.originTime);
    if (!Number.isFinite(origin) || origin < start || origin >= end) {
      continue;
    }
    if (!unique.has(event.id)) {
      unique.set(event.id, event);
    }
  }

  return [...unique.values()];
}

function summarizeGroup(
  group: MutableGroup,
  options: AggregateOptions,
): GeographicGroup {
  const timeSeries = buildTimeSeries(group.events, options.period, options.window);
  const totalEvents = group.events.length;
  if (timeSeries.reduce((total, bucket) => total + bucket.count, 0) !== totalEvents) {
    throw new Error(`La serie temporal del grupo ${group.id} no coincide con su total.`);
  }

  if (group.kind !== "country") {
    return {
      kind: group.kind,
      id: group.id,
      label: group.label,
      totalEvents,
      timeSeries,
    };
  }

  const strongestEvents = group.events
    .filter((event) => event.magnitude !== null)
    .sort(compareMagnitudeHighestFirst)
    .slice(0, 5);
  const strongestIds = new Set(strongestEvents.map(({ id }) => id));
  const recentEvents = group.events
    .filter((event) => !strongestIds.has(event.id))
    .sort(compareOriginNewestFirst)
    .slice(0, 5);

  return {
    kind: "country",
    id: group.id,
    countryId: group.countryId,
    name: group.name,
    continent: group.continent,
    totalEvents,
    timeSeries,
    strongestEvents,
    recentEvents,
  };
}

export function aggregateGeography(
  inputEvents: HistoricalEvent[],
  options: AggregateOptions,
  classifier: EpicenterClassifier = classifyEpicenter,
): GeographicAggregate {
  const events = normalizeEvents(inputEvents, options.window);
  const mutableGroups = new Map<string, MutableGroup>();

  for (const country of ANALYTICS_COUNTRIES) {
    const id = `country:${country.countryId}`;
    mutableGroups.set(id, {
      kind: "country",
      id,
      countryId: country.countryId,
      name: country.name,
      continent: country.continent,
      events: [],
    });
  }

  for (const { kind, label } of UNASSIGNED_GROUPS) {
    mutableGroups.set(kind, { kind, id: kind, label, events: [] });
  }

  for (const event of events) {
    const assignment = classifier(event.coordinates);
    const groupId = assignment.kind === "country"
      ? `country:${assignment.countryId}`
      : assignment.kind;
    let group = mutableGroups.get(groupId);

    if (!group && assignment.kind === "country") {
      group = {
        kind: "country",
        id: groupId,
        countryId: assignment.countryId,
        name: assignment.name,
        continent: assignment.continent,
        events: [],
      };
      mutableGroups.set(groupId, group);
    }
    if (!group) {
      throw new Error(`No se encontró un grupo geográfico para ${assignment.kind}.`);
    }

    group.events.push(event);
  }

  const groups = [...mutableGroups.values()].map((group) =>
    summarizeGroup(group, options),
  );
  groups.sort((first, second) => {
    if (first.kind === "country" && second.kind === "country") {
      return second.totalEvents - first.totalEvents || first.name.localeCompare(second.name);
    }
    if (first.kind === "country") return -1;
    if (second.kind === "country") return 1;
    return (
      UNASSIGNED_GROUPS.findIndex(({ kind }) => kind === first.kind) -
      UNASSIGNED_GROUPS.findIndex(({ kind }) => kind === second.kind)
    );
  });

  const groupedTotal = groups.reduce((total, group) => total + group.totalEvents, 0);
  if (groupedTotal !== events.length) {
    throw new Error("La suma de grupos geográficos no coincide con el total de eventos.");
  }

  return { totalEvents: events.length, groups };
}
