import type { Continent, EventPeriod } from "./types";

export const PERIOD_LABELS: Record<EventPeriod, string> = {
  hour: "Última hora",
  day: "Últimas 24 horas",
  week: "Últimos 7 días",
};

export const CONTINENT_LABELS: Record<Continent, string> = {
  "North America": "Norteamérica",
  "South America": "Sudamérica",
  Africa: "África",
  Asia: "Asia",
  Europe: "Europa",
  Oceania: "Oceanía",
  Antarctica: "Antártida",
};

export function describeActiveFilters(options: {
  minMagnitude: number | null;
  continent: Continent | "world";
}): string[] {
  const labels: string[] = [];

  if (options.minMagnitude !== null) {
    const magnitude = new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(options.minMagnitude);
    labels.push(`Magnitud mínima ≥ ${magnitude}`);
  }

  if (options.continent !== "world") {
    labels.push(CONTINENT_LABELS[options.continent]);
  }

  return labels;
}
