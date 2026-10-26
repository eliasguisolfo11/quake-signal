"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalyticsFilters } from "../lib/contracts";
import type { CountBucket } from "../lib/aggregations";
import type { CountryGroup } from "../lib/country-analytics";
import type { HistoricalEvent } from "../lib/usgs-catalog";
import type { NearestTectonicBoundary } from "../lib/tectonic-context";
import { TECTONIC_BOUNDARY_METADATA } from "../lib/tectonic-boundary-metadata";

const COUNT_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const MAGNITUDE_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const DISTANCE_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

const PERIOD_LABELS: Record<AnalyticsFilters["period"], string> = {
  "30d": "últimos 30 días",
  "12m": "últimos 12 meses",
  "5y": "últimos 5 años",
};

const BOUNDARY_LABELS: Record<string, string> = {
  "Convergent Boundary": "Convergente",
  "Divergent Boundary": "Divergente",
  "Transform Boundary": "Transformante",
  Other: "Otra clasificación",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function formatCoordinates(event: HistoricalEvent): string | null {
  if (!event.coordinates) return null;
  const latitude = Math.abs(event.coordinates.latitude).toFixed(3);
  const longitude = Math.abs(event.coordinates.longitude).toFixed(3);
  return `${latitude}° ${event.coordinates.latitude >= 0 ? "N" : "S"}, ${longitude}° ${event.coordinates.longitude >= 0 ? "E" : "O"}`;
}

function PeriodActivityChart({
  buckets,
  period,
  countryName,
}: {
  buckets: readonly CountBucket[];
  period: AnalyticsFilters["period"];
  countryName: string;
}) {
  const width = 760;
  const height = 166;
  const left = 40;
  const right = 8;
  const top = 12;
  const bottom = 128;
  const chartWidth = width - left - right;
  const chartHeight = bottom - top;
  const maximum = Math.max(0, ...buckets.map(({ count }) => count));
  const slot = buckets.length > 0 ? chartWidth / buckets.length : chartWidth;
  const barWidth = Math.max(1.5, Math.min(14, slot * 0.62));
  const labelCount = Math.min(4, buckets.length);
  const indexes = Array.from({ length: labelCount }, (_, index) =>
    labelCount <= 1
      ? 0
      : Math.round(index * (buckets.length - 1) / (labelCount - 1)),
  );
  const dateLabel = (value: string) => new Intl.DateTimeFormat("es-AR", period === "30d"
    ? { day: "2-digit", month: "short", timeZone: "UTC" }
    : { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(value));

  return (
    <section className="analytics-profile-activity" aria-labelledby="analytics-country-activity-title">
      <div className="analytics-profile-section-heading">
        <div>
          <p className="analytics-eyebrow">SERIE TEMPORAL</p>
          <h3 id="analytics-country-activity-title">Actividad en {countryName}</h3>
        </div>
        <span>eventos por {period === "30d" ? "día" : "mes"}</span>
      </div>
      {maximum === 0 ? (
        <p className="analytics-chart-empty">Sin eventos asignados a este país para el período consultado.</p>
      ) : (
        <>
          <div className="analytics-profile-chart-wrap">
            <svg
              className="analytics-profile-chart"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`Actividad sísmica observada en ${countryName}, agrupada ${period === "30d" ? "por día" : "por mes"}.`}
            >
              <line className="analytics-chart-grid" x1={left} x2={width - right} y1={bottom} y2={bottom} />
              <line className="analytics-chart-grid" x1={left} x2={width - right} y1={top} y2={top} />
              <text className="analytics-chart-tick" x={left - 8} y={top + 4} textAnchor="end">{COUNT_FORMATTER.format(maximum)}</text>
              <text className="analytics-chart-tick" x={left - 8} y={bottom + 4} textAnchor="end">0</text>
              {buckets.map((bucket, index) => {
                const barHeight = bucket.count / maximum * chartHeight;
                return (
                  <rect
                    className="analytics-chart-bar"
                    key={bucket.bucketStart}
                    x={left + index * slot + (slot - barWidth) / 2}
                    y={bottom - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx="1"
                  >
                    <title>{dateLabel(bucket.bucketStart)}: {COUNT_FORMATTER.format(bucket.count)} eventos</title>
                  </rect>
                );
              })}
              {indexes.map((index) => {
                const bucket = buckets[index];
                if (!bucket) return null;
                const x = left + index * slot + slot / 2;
                return (
                  <text className="analytics-chart-tick analytics-chart-date" key={bucket.bucketStart} x={x} y={bottom + 24} textAnchor="middle">
                    {dateLabel(bucket.bucketStart)}
                  </text>
                );
              })}
            </svg>
          </div>
          <details className="analytics-data-table-details">
            <summary>Ver valores por intervalo en tabla</summary>
            <div className="analytics-data-table-scroll">
              <table>
                <thead><tr><th scope="col">Intervalo UTC</th><th scope="col">Eventos</th></tr></thead>
                <tbody>{buckets.map((bucket) => (
                  <tr key={bucket.bucketStart}>
                    <th scope="row">{dateLabel(bucket.bucketStart)}</th>
                    <td>{COUNT_FORMATTER.format(bucket.count)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function EventFacts({ event }: { event: HistoricalEvent }) {
  const [tectonicContext, setTectonicContext] = useState<
    | { eventId: string; status: "loading" }
    | { eventId: string; status: "error" }
    | { eventId: string; status: "ready"; boundary: NearestTectonicBoundary | null }
  >({ eventId: event.id, status: "loading" });

  useEffect(() => {
    let isCurrentEvent = true;

    void import("../lib/tectonic-context")
      .then(({ findNearestTectonicBoundary }) => {
        if (isCurrentEvent) {
          setTectonicContext({
            eventId: event.id,
            status: "ready",
            boundary: findNearestTectonicBoundary(event.coordinates),
          });
        }
      })
      .catch(() => {
        if (isCurrentEvent) setTectonicContext({ eventId: event.id, status: "error" });
      });

    return () => {
      isCurrentEvent = false;
    };
  }, [event.coordinates, event.id]);

  const eventContext = tectonicContext.eventId === event.id
    ? tectonicContext
    : { eventId: event.id, status: "loading" as const };
  const boundary = eventContext.status === "ready" ? eventContext.boundary : null;
  const coordinates = formatCoordinates(event);
  const boundaryLabel = boundary
    ? boundary.boundaryName ?? BOUNDARY_LABELS[boundary.boundaryType] ?? "Límite sin nombre en la fuente"
    : null;

  return (
    <section className="analytics-event-facts" aria-label="Datos del evento y contexto tectónico">
      <div className="analytics-facts-heading">
        <p className="analytics-eyebrow">EVENTO DESTACADO</p>
        {event.url ? (
          <a href={event.url} target="_blank" rel="noreferrer">Ficha del USGS <span aria-hidden="true">↗</span></a>
        ) : null}
      </div>
      <h4>{event.place ?? "Ubicación no informada"}</h4>
      <dl className="analytics-event-facts-grid">
        <div><dt>Magnitud</dt><dd>{event.magnitude === null ? "Sin dato" : MAGNITUDE_FORMATTER.format(event.magnitude)}</dd></div>
        <div><dt>Profundidad</dt><dd>{event.depthKm === null ? "Sin dato" : `${DISTANCE_FORMATTER.format(event.depthKm)} km`}</dd></div>
        <div><dt>Origen UTC</dt><dd>{formatDate(event.originTime)}</dd></div>
        <div><dt>Coordenadas</dt><dd>{coordinates ?? "No disponibles"}</dd></div>
      </dl>
      <div className="analytics-tectonic-context">
        <span className="analytics-tectonic-marker" aria-hidden="true" />
        <div>
          <p className="analytics-eyebrow">CONTEXTO TECTÓNICO</p>
          {eventContext.status === "loading" ? (
            <p role="status">Cargando contexto de placas…</p>
          ) : eventContext.status === "error" ? (
            <p role="status">No se pudo cargar el contexto tectónico para esta ubicación.</p>
          ) : boundary ? (
            <p>
              <strong>{boundaryLabel}</strong>
              <span>
                {boundary.boundaryName ? ` · ${BOUNDARY_LABELS[boundary.boundaryType]}` : ""}
                {` · ${DISTANCE_FORMATTER.format(boundary.distanceKm)} km del trazo cartográfico más cercano`}
              </span>
            </p>
          ) : (
            <p>Sin datos tectónicos para esta ubicación.</p>
          )}
          <a href={TECTONIC_BOUNDARY_METADATA.source} target="_blank" rel="noreferrer">Fuente de límites de placas: USGS</a>
        </div>
      </div>
      <p className="analytics-approximation-note">La distancia es geométrica y aproximada; no determina la causa del evento ni predice actividad futura.</p>
    </section>
  );
}

export function CountryProfile({
  group,
  period,
  onClose,
}: {
  group: CountryGroup;
  period: AnalyticsFilters["period"];
  onClose: () => void;
}) {
  const availableEvents = useMemo(() => {
    const seen = new Set<string>();
    return [...group.strongestEvents, ...group.recentEvents].filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }, [group]);
  const [selectedEventId, setSelectedEventId] = useState(availableEvents[0]?.id ?? null);
  const selectedEvent = availableEvents.find(({ id }) => id === selectedEventId) ?? availableEvents[0] ?? null;
  const strongestIds = new Set(group.strongestEvents.map(({ id }) => id));

  return (
    <section className="analytics-country-profile" aria-labelledby="analytics-country-profile-title">
      <header className="analytics-country-profile-header">
        <div>
          <p className="analytics-eyebrow">FICHA DE ZONA · {group.continent}</p>
          <h2 id="analytics-country-profile-title">{group.name}</h2>
        </div>
        <div className="analytics-country-profile-actions">
          <p><strong>{COUNT_FORMATTER.format(group.totalEvents)}</strong><span>eventos observados · {PERIOD_LABELS[period]}</span></p>
          <button className="analytics-text-action" type="button" onClick={onClose}>Cerrar ficha</button>
        </div>
      </header>

      <PeriodActivityChart buckets={group.timeSeries} period={period} countryName={group.name} />

      <div className="analytics-country-profile-lower">
        <section className="analytics-highlight-list" aria-labelledby="analytics-highlights-title">
          <div className="analytics-profile-section-heading">
            <div>
              <p className="analytics-eyebrow">CATÁLOGO USGS</p>
              <h3 id="analytics-highlights-title">Eventos destacados</h3>
            </div>
            <span>{availableEvents.length} eventos</span>
          </div>
          {availableEvents.length === 0 ? (
            <p className="analytics-chart-empty">No hay eventos de este país para mostrar.</p>
          ) : (
            <ol className="analytics-highlight-events">
              {availableEvents.map((event) => {
                const isStrongest = strongestIds.has(event.id);
                return (
                  <li key={event.id}>
                    <button
                      className={`analytics-highlight-event${event.id === selectedEvent?.id ? " is-selected" : ""}`}
                      type="button"
                      aria-pressed={event.id === selectedEvent?.id}
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <span className="analytics-highlight-magnitude">
                        {event.magnitude === null ? "—" : MAGNITUDE_FORMATTER.format(event.magnitude)}
                      </span>
                      <span className="analytics-highlight-copy">
                        <strong>{event.place ?? "Ubicación no informada"}</strong>
                        <span>{formatDate(event.originTime)}</span>
                      </span>
                      <span className="analytics-highlight-kind">{isStrongest ? "Mayor magnitud" : "Más reciente"}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        {selectedEvent ? <EventFacts event={selectedEvent} /> : null}
      </div>
    </section>
  );
}
