import type { AnalyticsAggregate } from "./aggregations";
import type { GeographicAggregate } from "./country-analytics";
import type { AnalyticsPeriod, AnalyticsWindow } from "./periods";
import type { Continent } from "@/features/events/lib/types";

export type AnalyticsFilters = {
  period: AnalyticsPeriod;
  minMagnitude: number | null;
  continent: Continent | "world";
};

export type AnalyticsResultStatus =
  | "available"
  | "catalog-empty"
  | "no-matches"
  | "incomplete";

export type AnalyticsRecovery = {
  status: "complete" | "incomplete";
  expectedCount: number;
  retrievedCount: number;
  attempts: number;
};

export type AnalyticsQueryProvenance = {
  countUrl: string;
  firstPageUrl: string;
  sourceMinimumMagnitude: number | null;
  pageLimit: number;
};

export type AnalyticsData = {
  summary: Omit<AnalyticsAggregate, "events">;
  geography: GeographicAggregate;
};

export type AnalyticsSuccessResponse = {
  data: AnalyticsData | null;
  meta: {
    source: "USGS";
    sourceUrl: string;
    period: AnalyticsPeriod;
    filters: Omit<AnalyticsFilters, "period">;
    window: AnalyticsWindow;
    requestedAt: string;
    retrievedAt: string;
    coverageNote: string;
    recovery: AnalyticsRecovery;
    resultStatus: AnalyticsResultStatus;
    query: AnalyticsQueryProvenance;
    geography: {
      countries: string;
      land: string;
    };
  };
};
