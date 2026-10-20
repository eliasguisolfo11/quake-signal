import type { QuakeEvent } from "../lib/types";
import {
  describeEventSummary,
  formatMagnitude,
  formatLocalWithZone,
  formatRelative,
  formatUtc,
} from "./event-formatters";

type EventSummary = {
  count: number;
  maxMagnitude: number | null;
};

function EventRow(props: {
  event: QuakeEvent;
  onSelect: (eventId: string) => void;
}) {
  const { event, onSelect } = props;

  return (
    <li className="event-list-item">
      <button
        className="event-row"
        type="button"
        onClick={() => onSelect(event.id)}
      >
        <span className="event-magnitude">{formatMagnitude(event.magnitude)}</span>
        <span className="event-row-copy">
          <span className="event-place">{event.place ?? "Ubicación no disponible"}</span>
          <span className="event-row-meta">
            <time dateTime={event.originTime}>{formatRelative(event.originTime)}</time>
            <span aria-hidden="true">·</span>
            <span>
              {event.depthKm === null ? "Profundidad —" : `${event.depthKm.toFixed(1)} km`}
            </span>
          </span>
        </span>
        <span className="event-row-arrow" aria-hidden="true">
          ↗
        </span>
      </button>
    </li>
  );
}

function EventDetail(props: { event: QuakeEvent; onBack: () => void }) {
  const { event, onBack } = props;
  const coordinates = event.coordinates
    ? `${event.coordinates.latitude.toFixed(4)}, ${event.coordinates.longitude.toFixed(4)}`
    : null;

  return (
    <section className="event-detail" aria-labelledby="event-detail-title">
      <div className="detail-heading">
        <button className="text-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Volver a eventos
        </button>
        <h2 id="event-detail-title">
          <span className="detail-magnitude">{formatMagnitude(event.magnitude)}</span>
          {event.place ?? "Ubicación no disponible"}
        </h2>
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Hora de origen</dt>
          <EventTimestamp value={event.originTime} />
        </div>
        <div>
          <dt>Profundidad</dt>
          <dd>{event.depthKm === null ? "No disponible" : `${event.depthKm.toFixed(1)} km`}</dd>
        </div>
        <div>
          <dt>Coordenadas</dt>
          <dd className="technical-value">{coordinates ?? "No disponible"}</dd>
        </div>
        <div>
          <dt>Evento actualizado</dt>
          <EventTimestamp value={event.updatedAt} />
        </div>
      </dl>

      {event.alert && (
        <p className="event-alert">
          Alerta informada por USGS: <strong>{event.alert}</strong>
        </p>
      )}

      <div className="detail-source">
        <span>Fuente: USGS</span>
        {event.url ? (
          <a href={event.url} target="_blank" rel="noreferrer">
            Abrir registro oficial <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span>Registro oficial no disponible</span>
        )}
      </div>
    </section>
  );
}

function EventTimestamp({ value }: { value: string | null }) {
  if (!value) {
    return <dd>No disponible</dd>;
  }

  return (
    <dd>
      <time dateTime={value}>{formatLocalWithZone(value)} (hora local)</time>
      <span className="detail-time-utc">{formatUtc(value)}</span>
    </dd>
  );
}

function EmptyFeed(props: {
  hasPayload: boolean;
  hasEvents: boolean;
  hasFilters: boolean;
  isLoading: boolean;
  onClear: () => void;
}) {
  const { hasPayload, hasEvents, hasFilters, isLoading, onClear } = props;

  if (isLoading && !hasPayload) {
    return (
      <div className="feed-empty" role="status">
        <p>Consultando actividad sísmica…</p>
        <span>Se están cargando los eventos de USGS.</span>
      </div>
    );
  }

  if (hasFilters && hasEvents) {
    return (
      <div className="feed-empty">
        <p>Ningún evento coincide con estos filtros.</p>
        <span>El período consultado sí contiene eventos.</span>
        <button className="text-button" type="button" onClick={onClear}>
          Limpiar filtros
        </button>
      </div>
    );
  }

  if (hasPayload) {
    return (
      <div className="feed-empty">
        <p>No se encontraron eventos en este período.</p>
        <span>USGS devolvió un feed válido sin eventos.</span>
      </div>
    );
  }

  return (
    <div className="feed-empty">
      <p>El feed todavía no está disponible.</p>
      <span>Revisá la conexión e intentá actualizar.</span>
    </div>
  );
}

export function EventFeedPanel({
  mode,
  visibleEvents,
  filteredCount,
  totalEventCount,
  selectedEvent,
  summary,
  isLoading,
  hasPayload,
  hasFilters,
  onClearFilters,
  onSelectEvent,
  onBackToEvents,
}: {
  mode: "monitor" | "history";
  visibleEvents: QuakeEvent[];
  filteredCount: number;
  totalEventCount: number;
  selectedEvent: QuakeEvent | null;
  summary: EventSummary;
  isLoading: boolean;
  hasPayload: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onSelectEvent: (eventId: string) => void;
  onBackToEvents: () => void;
}) {
  return (
    <section className="feed-panel event-feed-panel" aria-labelledby="event-feed-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            {mode === "monitor" ? "Actividad reciente" : "Últimos siete días"}
          </p>
          <h2 id="event-feed-title">{selectedEvent ? "Detalle del evento" : "Eventos"}</h2>
        </div>
        <span
          className="event-count"
          aria-label={describeEventSummary(summary.count, summary.maxMagnitude)}
        >
          {summary.count}
        </span>
      </div>

      {selectedEvent ? (
        <EventDetail event={selectedEvent} onBack={onBackToEvents} />
      ) : (
        <>
          {mode === "monitor" && filteredCount > visibleEvents.length && (
            <div className="feed-list-intro">
              Mostrando los {visibleEvents.length} más recientes de {filteredCount}
              {" · "}
              <a href="/history">Ver los siete días</a>
            </div>
          )}
          {visibleEvents.length > 0 ? (
            <ul className="event-list">
              {visibleEvents.map((event) => (
                <EventRow
                  event={event}
                  key={event.id}
                  onSelect={onSelectEvent}
                />
              ))}
            </ul>
          ) : (
            <EmptyFeed
              hasPayload={hasPayload}
              hasEvents={totalEventCount > 0}
              hasFilters={hasFilters}
              isLoading={isLoading}
              onClear={onClearFilters}
            />
          )}
        </>
      )}
    </section>
  );
}
