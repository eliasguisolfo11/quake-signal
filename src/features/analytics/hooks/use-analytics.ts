"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnalyticsFilters, AnalyticsSuccessResponse } from "../lib/contracts";
import { AnalyticsApiError, buildAnalyticsRequestUrl, fetchAnalytics } from "../lib/client-api";

export type AnalyticsQueryState = {
  status: "loading" | "refreshing" | "ready" | "error";
  payload: AnalyticsSuccessResponse | null;
  error: AnalyticsApiError | null;
  requestUrl: string;
  refreshVersion: number;
};

function createInitialState(requestUrl: string, refreshVersion: number): AnalyticsQueryState {
  return { status: "loading", payload: null, error: null, requestUrl, refreshVersion };
}

export function useAnalytics(filters: AnalyticsFilters) {
  const requestUrl = buildAnalyticsRequestUrl(filters);
  const [state, setState] = useState<AnalyticsQueryState>(() => createInitialState(requestUrl, 0));
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestFilters = useMemo(() => ({
    period: filters.period,
    minMagnitude: filters.minMagnitude,
    continent: filters.continent,
  }), [filters.continent, filters.minMagnitude, filters.period]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchAnalytics(requestFilters, controller.signal)
      .then((payload) => {
        if (active) setState({ status: "ready", payload, error: null, requestUrl, refreshVersion });
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        const apiError = error instanceof AnalyticsApiError
          ? error
          : new AnalyticsApiError("No se pudo completar el análisis. Intentá de nuevo.", "ANALYTICS_FAILED", null);
        setState((previous) => ({
          status: previous.requestUrl === requestUrl && previous.payload ? "ready" : "error",
          payload: previous.requestUrl === requestUrl ? previous.payload : null,
          error: apiError,
          requestUrl,
          refreshVersion,
        }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshVersion, requestFilters, requestUrl]);

  const refresh = useCallback(() => setRefreshVersion((version) => version + 1), []);
  const currentState = state.requestUrl !== requestUrl
    ? createInitialState(requestUrl, refreshVersion)
    : state.refreshVersion !== refreshVersion
      ? {
          ...state,
          status: state.payload ? "refreshing" as const : "loading" as const,
          error: null,
          refreshVersion,
        }
      : state;
  return { ...currentState, refresh };
}
