"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { useEvents } from "../hooks/use-events";
import { filterEvents, summarizeEvents } from "../lib/event-filters";
import { PERIOD_LABELS } from "../lib/event-labels";
import type { Continent, EventPeriod } from "../lib/types";
import { EventControls } from "./event-controls";
import { EventFeedPanel } from "./event-feed-panel";
import {
  describeEventSummary,
  formatLocal,
  formatUtc,
} from "./event-formatters";

const EventMap = dynamic(
  () => import("./event-map").then((module) => module.EventMap),
  {
    ssr: false,
    loading: () => <div className="map-loading" role="status">Cargando mapa</div>,
  },
);

export function EventExplorer({ mode }: { mode: "monitor" | "history" }) {
  const initialPeriod: EventPeriod = mode === "monitor" ? "day" : "week";
  const { period, payload, isLoading, error, choosePeriod, refresh } = useEvents({
    initialPeriod,
    pollWhileVisible: mode === "monitor",
  });
  const [minimumMagnitude, setMinimumMagnitude] = useState("");
  const [continent, setContinent] = useState<Continent | "world">("world");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapRetryKey, setMapRetryKey] = useState(0);

  const magnitudeValue =
    minimumMagnitude.trim() === "" ? null : Number(minimumMagnitude);
  const magnitudeError =
    magnitudeValue !== null &&
    (!Number.isFinite(magnitudeValue) || !Number.isInteger(magnitudeValue * 10));
  const minMagnitude = magnitudeError ? null : magnitudeValue;
  const filteredEvents = useMemo(
    () => filterEvents(payload?.events ?? [], { minMagnitude, continent }),
    [continent, minMagnitude, payload?.events],
  );
  const summary = useMemo(() => summarizeEvents(filteredEvents), [filteredEvents]);
  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? null;
  const hasFilters = minimumMagnitude.trim() !== "" || continent !== "world";
  const status = error ? "error" : isLoading && !payload ? "loading" : "ready";
  const visibleEvents =
    mode === "monitor" ? filteredEvents.slice(0, 10) : filteredEvents;
  const displayedPeriod = payload?.period ?? period;

  const selectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);
  const reportMapError = useCallback(() => {
    setMapError(true);
  }, []);
  const retryMap = () => {
    setMapError(false);
    setMapRetryKey((current) => current + 1);
  };
  const clearFilters = () => {
    setMinimumMagnitude("");
    setContinent("world");
    setSelectedEventId(null);
  };
  const changePeriod = (nextPeriod: EventPeriod) => {
    setSelectedEventId(null);
    choosePeriod(nextPeriod);
  };
  const changeMinimumMagnitude = (value: string) => {
    setSelectedEventId(null);
    setMinimumMagnitude(value);
  };
  const changeContinent = (value: Continent | "world") => {
    setSelectedEventId(null);
    setContinent(value);
  };

  return (
    <AppShell
      active={mode}
      status={status}
      receivedAt={payload?.receivedAt ?? null}
      onRefresh={refresh}
      isRefreshing={isLoading}
    >
      <div className={`event-page event-page--${mode}`}>
        <section className="page-heading event-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">{mode === "monitor" ? "Monitor" : "Archivo"}</p>
            <h1 id="page-title">
              {mode === "monitor" ? "Actividad sísmica" : "Historial sísmico"}
            </h1>
            <p className="page-description">
              {mode === "monitor"
                ? "Eventos reportados por USGS, ordenados por hora de origen."
                : "Explorá los eventos reportados por USGS durante los últimos siete días."}
            </p>
          </div>
          <div className="event-summary" aria-live="polite">
            <span className="summary-value">
              {describeEventSummary(summary.count, summary.maxMagnitude)}
            </span>
            <span className="summary-period">{PERIOD_LABELS[displayedPeriod]}</span>
          </div>
        </section>

        <EventControls
          mode={mode}
          period={period}
          isLoading={isLoading}
          minimumMagnitude={minimumMagnitude}
          magnitudeError={magnitudeError}
          continent={continent}
          hasFilters={hasFilters}
          onPeriodChange={changePeriod}
          onMinimumMagnitudeChange={changeMinimumMagnitude}
          onContinentChange={changeContinent}
          onClearFilters={clearFilters}
        />

        <div className="source-meta" aria-live="polite">
          {payload ? (
            <>
              <a href={payload.sourceUrl} target="_blank" rel="noreferrer">
                Datos de USGS <span aria-hidden="true">↗</span>
              </a>
              <span>Feed generado {formatUtc(payload.generatedAt)}</span>
              <span>Recibido {formatLocal(payload.receivedAt)}</span>
            </>
          ) : (
            <span>Fuente: USGS GeoJSON</span>
          )}
          {isLoading && payload && payload.period !== period && (
            <span role="status">
              Consultando {PERIOD_LABELS[period].toLowerCase()}; se conserva el período anterior.
            </span>
          )}
        </div>

        {error && (
          <div className="inline-error" role="alert">
            <span>{error}</span>
            <button className="text-button" type="button" onClick={refresh}>
              Reintentar
            </button>
          </div>
        )}

        <div className={mode === "monitor" ? "event-layout" : "event-layout event-layout--history"}>
          {mode === "monitor" && (
            <section className="map-panel live-map-panel" aria-labelledby="map-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Distribución geográfica</p>
                  <h2 id="map-title">Epicentros</h2>
                </div>
                <span className="status-label">
                  {filteredEvents.filter((event) => event.coordinates).length} ubicaciones
                </span>
              </div>
              {mapError ? (
                <div className="map-failure" role="status">
                  <div>
                    <p className="eyebrow">Servicio cartográfico</p>
                    <h3>El mapa no está disponible</h3>
                    <p>La lista y los detalles siguen disponibles con los datos de USGS.</p>
                    <button className="text-button" type="button" onClick={retryMap}>
                      Reintentar mapa
                    </button>
                  </div>
                </div>
              ) : (
                <EventMap
                  key={mapRetryKey}
                  events={filteredEvents}
                  selectedEventId={selectedEventId}
                  onSelect={selectEvent}
                  onError={reportMapError}
                />
              )}
            </section>
          )}

          <EventFeedPanel
            mode={mode}
            visibleEvents={visibleEvents}
            filteredCount={filteredEvents.length}
            totalEventCount={payload?.events.length ?? 0}
            selectedEvent={selectedEvent}
            summary={summary}
            isLoading={isLoading}
            hasPayload={payload !== null}
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
            onSelectEvent={selectEvent}
            onBackToEvents={() => setSelectedEventId(null)}
          />

          {mode === "history" && !selectedEvent && (
            <aside className="history-detail-hint">
              <p className="eyebrow">Detalle</p>
              <h2>Seleccioná un evento</h2>
              <p>
                Vas a encontrar sus datos de origen, la hora UTC y el registro oficial cuando esté disponible.
              </p>
            </aside>
          )}
        </div>
      </div>
    </AppShell>
  );
}
