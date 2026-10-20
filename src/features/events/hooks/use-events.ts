"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventPeriod, EventsApiError, EventsPayload } from "../lib/types";

function isEventsPayload(value: unknown): value is EventsPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<EventsPayload>;
  return (
    payload.source === "USGS" &&
    (payload.period === "hour" || payload.period === "day" || payload.period === "week") &&
    typeof payload.generatedAt === "string" &&
    typeof payload.receivedAt === "string" &&
    Array.isArray(payload.events)
  );
}

function errorMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "error" in value) {
    const apiError = value as EventsApiError;
    if (typeof apiError.error?.message === "string") {
      return apiError.error.message;
    }
  }

  return fallback;
}

export function useEvents(options: {
  initialPeriod: EventPeriod;
  pollWhileVisible: boolean;
}) {
  const { initialPeriod, pollWhileVisible } = options;
  const [period, setPeriod] = useState(initialPeriod);
  const [payload, setPayload] = useState<EventsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const currentPeriod = useRef(initialPeriod);
  const lastPayload = useRef<EventsPayload | null>(null);

  const load = useCallback(async (requestedPeriod: EventPeriod) => {
    const requestId = ++requestSequence.current;
    const previousPayload = lastPayload.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/events?period=${encodeURIComponent(requestedPeriod)}`,
        { cache: "no-store" },
      );
      const body: unknown = await response.json();

      if (!response.ok || !isEventsPayload(body) || body.period !== requestedPeriod) {
        throw new Error(
          errorMessage(body, "No se pudo validar la respuesta de USGS."),
        );
      }

      if (requestId !== requestSequence.current) {
        return;
      }

      lastPayload.current = body;
      currentPeriod.current = body.period;
      setPeriod(body.period);
      setPayload(body);
    } catch (caughtError) {
      if (requestId !== requestSequence.current) {
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo consultar USGS. Intentá de nuevo.",
      );

      if (previousPayload) {
        currentPeriod.current = previousPayload.period;
        setPeriod(previousPayload.period);
        setPayload(previousPayload);
      }
    } finally {
      if (requestId === requestSequence.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const choosePeriod = useCallback(
    (nextPeriod: EventPeriod) => {
      currentPeriod.current = nextPeriod;
      setPeriod(nextPeriod);
      void load(nextPeriod);
    },
    [load],
  );

  const refresh = useCallback(() => {
    void load(currentPeriod.current);
  }, [load]);

  useEffect(() => {
    let canceled = false;
    void Promise.resolve().then(() => {
      if (!canceled) {
        void load(initialPeriod);
      }
    });

    return () => {
      canceled = true;
      requestSequence.current += 1;
    };
  }, [initialPeriod, load]);

  useEffect(() => {
    if (!pollWhileVisible) {
      return;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void load(currentPeriod.current);
      }
    };
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load, pollWhileVisible]);

  return { period, payload, isLoading, error, choosePeriod, refresh };
}
