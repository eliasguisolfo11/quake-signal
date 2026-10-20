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
