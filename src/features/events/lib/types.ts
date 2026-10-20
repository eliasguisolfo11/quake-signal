export const EVENT_PERIODS = ["hour", "day", "week"] as const;

export type EventPeriod = (typeof EVENT_PERIODS)[number];

export const CONTINENTS = [
  "North America",
  "South America",
  "Africa",
  "Asia",
  "Europe",
  "Oceania",
  "Antarctica",
] as const;

export type Continent = (typeof CONTINENTS)[number];

export type Coordinates = {
  longitude: number;
  latitude: number;
};

export type QuakeEvent = {
  id: string;
  magnitude: number | null;
  place: string | null;
  coordinates: Coordinates | null;
  depthKm: number | null;
  originTime: string;
  updatedAt: string | null;
  alert: string | null;
  url: string | null;
  continent: Continent | null;
};

export type EventsPayload = {
  source: "USGS";
  sourceUrl: string;
  period: EventPeriod;
  generatedAt: string;
  receivedAt: string;
  events: QuakeEvent[];
};

export type EventsApiError = {
  error: {
    code: string;
    message: string;
  };
};
