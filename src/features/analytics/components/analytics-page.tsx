"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { CONTINENTS, type Continent } from "@/features/events/lib/types";
import type { AnalyticsFilters, AnalyticsSuccessResponse } from "../lib/contracts";
import type { AnalyticsPeriod } from "../lib/periods";
import {
  parseAnalyticsFilters,
  parseMinimumMagnitudeInput,
  serializeAnalyticsFilters,
} from "../lib/client-api";
import { useAnalytics } from "../hooks/use-analytics";
import { AnalyticsInsights } from "./analytics-insights";

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "30d", label: "30 días" },
  { value: "12m", label: "12 meses" },
  { value: "5y", label: "5 años" },
];

const CONTINENT_LABELS: Record<Continent, string> = {
  "North America": "Norteamérica",
  "South America": "Sudamérica",
  Africa: "África",
  Asia: "Asia",
  Europe: "Europa",
  Oceania: "Oceanía",
  Antarctica: "Antártida",
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);
}

function formatMagnitude(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatUtc(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Fecha UTC no disponible";
  return `${timestamp.toISOString().replace("T", " ").replace("Z", " UTC")}`;
}

function scopeLabel(filters: AnalyticsFilters): string {
  const parts = [
    filters.continent === "world" ? "todo el mundo" : CONTINENT_LABELS[filters.continent],
    filters.minMagnitude === null ? null : `magnitud ≥ ${formatMagnitude(filters.minMagnitude)}`,
  ].filter((part): part is string => part !== null);
  return parts.join(" · ");
}

function pageDescription(payload: AnalyticsSuccessResponse | null, filters: AnalyticsFilters): string {
  if (!payload?.data) return "Actividad sísmica registrada en el catálogo público de USGS.";
  const { summary } = payload.data;
  return `${formatCount(summary.totalEvents)} eventos registrados en ${scopeLabel(filters)} · magnitud máxima ${formatMagnitude(summary.maximumMagnitude)}.`;
}

function StatePanel({
  title,
  message,
  action,
  busy = false,
}: {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
  busy?: boolean;
}) {
  return (
    <section className="analytics-state-panel" aria-live="polite" aria-busy={busy}>
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? <button className="analytics-text-action" type="button" onClick={action.onClick}>{action.label}</button> : null}
    </section>
  );
}

function DataProvenance({ payload }: { payload: AnalyticsSuccessResponse }) {
  const { meta } = payload;
  const period = PERIOD_OPTIONS.find((option) => option.value === meta.period)?.label ?? meta.period;
  return (
    <section className="analytics-provenance" aria-label="Procedencia y cobertura">
      <p>
        <span>Fuente:</span>{" "}
        <a href={meta.sourceUrl} target="_blank" rel="noreferrer">USGS · FDSN Event Web Service</a>
        <span> · {period} · {scopeLabel({
          period: meta.period,
          minMagnitude: meta.filters.minMagnitude,
          continent: meta.filters.continent,
        })}</span>
      </p>
      <details className="analytics-provenance-details">
        <summary>Intervalo UTC, recuperación y método</summary>
        <div className="analytics-provenance-details-body">
          <p>Ventana: {formatUtc(meta.window.startInclusive)} – {formatUtc(meta.window.endExclusive)}</p>
          <p>
            Recuperación: {formatCount(meta.recovery.retrievedCount)} de {formatCount(meta.recovery.expectedCount)} registros
            <span> · Consultado {formatUtc(meta.retrievedAt)}</span>
            <span> · <a href={meta.query.firstPageUrl} target="_blank" rel="noreferrer">Ver consulta del catálogo</a></span>
          </p>
          <p>Geografía: {meta.geography.countries} · {meta.geography.land}</p>
          <p>{meta.coverageNote}</p>
        </div>
      </details>
    </section>
  );
}

function PendingProvenance({ filters }: { filters: AnalyticsFilters }) {
  const period = PERIOD_OPTIONS.find((option) => option.value === filters.period)?.label ?? filters.period;
  return (
    <section className="analytics-provenance" aria-label="Procedencia de la consulta">
      <p>
        Fuente: <a href="https://earthquake.usgs.gov/fdsnws/event/1/query" target="_blank" rel="noreferrer">USGS · FDSN Event Web Service</a>
        <span> · Período: {period} · Ámbito: {scopeLabel(filters)}</span>
      </p>
      <p>La ventana exacta UTC y la hora de recuperación se mostrarán cuando se complete la consulta.</p>
    </section>
  );
}

function AnalyticsLoading() {
  return (
    <section className="analytics-loading" aria-label="Cargando análisis" aria-busy="true">
      <div className="analytics-loading-summary"><span /><span /><span /></div>
      <div className="analytics-loading-panels"><span /><span /></div>
    </section>
  );
}

export function AnalyticsPage() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(
    () => parseAnalyticsFilters(new URLSearchParams(queryString)),
    [queryString],
  );

  return <AnalyticsPageContent key={queryString} filters={filters} />;
}

function AnalyticsPageContent({ filters }: { filters: AnalyticsFilters }) {
  const pathname = usePathname();
  const router = useRouter();
  const query = useAnalytics(filters);
  const [draftPeriod, setDraftPeriod] = useState(filters.period);
  const [draftMagnitude, setDraftMagnitude] = useState(
    filters.minMagnitude === null ? "" : String(filters.minMagnitude),
  );
  const [draftContinent, setDraftContinent] = useState<Continent | "world">(filters.continent);
  const [filterError, setFilterError] = useState<string | null>(null);
  const payload = query.payload;

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const magnitude = parseMinimumMagnitudeInput(draftMagnitude);
    if (magnitude.error) {
      setFilterError(magnitude.error);
      return;
    }
    setFilterError(null);
    const nextFilters: AnalyticsFilters = {
      period: draftPeriod,
      minMagnitude: magnitude.value,
      continent: draftContinent,
    };
    router.replace(`${pathname}?${serializeAnalyticsFilters(nextFilters)}`, { scroll: false });
  };

  const resetFilters = () => {
    const defaults: AnalyticsFilters = { period: "30d", minMagnitude: null, continent: "world" };
    setDraftPeriod(defaults.period);
    setDraftMagnitude("");
    setDraftContinent(defaults.continent);
    setFilterError(null);
    router.replace(`${pathname}?${serializeAnalyticsFilters(defaults)}`, { scroll: false });
  };

  const receivedAt = payload?.meta.retrievedAt ?? null;
  const shellStatus = query.status === "loading" || query.status === "refreshing"
    ? "loading"
    : query.error && !payload
      ? "error"
      : "ready";

  return (
    <AppShell
      active="analytics"
      status={shellStatus}
      receivedAt={receivedAt}
      onRefresh={query.refresh}
      isRefreshing={query.status === "loading" || query.status === "refreshing"}
    >
      <div className="analytics-page">
        <header className="page-heading analytics-page-heading">
          <div>
            <h1>Análisis sísmico</h1>
            <p className="page-description">{pageDescription(payload, filters)}</p>
          </div>
        </header>

        <form className="analytics-filter-bar" onSubmit={applyFilters}>
          <fieldset className="analytics-period-control">
            <legend>Período</legend>
            <div className="analytics-period-options">
              {PERIOD_OPTIONS.map((option) => (
                <label className="analytics-period-option" key={option.value}>
                  <input
                    type="radio"
                    name="period"
                    value={option.value}
                    checked={draftPeriod === option.value}
                    onChange={() => setDraftPeriod(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="analytics-filter-field">
            <span>Magnitud mínima</span>
            <span className="analytics-number-input">
              <input
                type="text"
                inputMode="decimal"
                value={draftMagnitude}
                maxLength={8}
                aria-invalid={Boolean(filterError)}
                aria-describedby={filterError ? "analytics-magnitude-error" : "analytics-magnitude-help"}
                onChange={(event) => setDraftMagnitude(event.target.value)}
              />
              <span aria-hidden="true">M</span>
            </span>
            <span className="sr-only" id="analytics-magnitude-help">Opcional; incrementos de 0,1.</span>
            {filterError ? <span className="analytics-filter-error" id="analytics-magnitude-error">{filterError}</span> : null}
          </label>

          <label className="analytics-filter-field analytics-continent-field">
            <span>Continente</span>
            <select
              value={draftContinent}
              onChange={(event) => setDraftContinent(event.target.value as Continent | "world")}
            >
              <option value="world">Todo el mundo</option>
              {CONTINENTS.map((continent) => (
                <option value={continent} key={continent}>{CONTINENT_LABELS[continent]}</option>
              ))}
            </select>
          </label>

          <div className="analytics-filter-actions">
            <button className="analytics-apply-button" type="submit">Aplicar filtros</button>
            <button className="analytics-reset-button" type="button" onClick={resetFilters}>Restablecer</button>
          </div>
        </form>

        {payload ? <DataProvenance payload={payload} /> : <PendingProvenance filters={filters} />}
        {query.error && payload ? (
          <div className="analytics-inline-error" role="status">
            <p>{query.error.message} Se conserva la última respuesta recibida: {formatUtc(payload.meta.retrievedAt)}.</p>
            <button className="analytics-text-action" type="button" onClick={query.refresh}>Reintentar</button>
          </div>
        ) : null}

        {query.status === "loading" && !payload ? <AnalyticsLoading /> : null}
        {query.error && !payload ? (
          <StatePanel title="No se pudo cargar el análisis" message={query.error.message} action={{ label: "Reintentar", onClick: query.refresh }} />
        ) : null}

        {payload?.meta.resultStatus === "incomplete" ? (
          <StatePanel
            title="Consulta histórica incompleta"
            message={`USGS indicó ${formatCount(payload.meta.recovery.expectedCount)} registros y se recuperaron ${formatCount(payload.meta.recovery.retrievedCount)}. No se muestran estadísticas parciales.`}
            action={{ label: "Reintentar consulta", onClick: query.refresh }}
          />
        ) : null}

        {payload?.data ? (
          <>
            {payload.meta.resultStatus === "catalog-empty" ? (
              <StatePanel title="Sin eventos en este período" message="USGS no registró eventos para la ventana y los filtros seleccionados." />
            ) : payload.meta.resultStatus === "no-matches" ? (
              <StatePanel title="Sin coincidencias" message={`No hay eventos que coincidan con ${scopeLabel(filters)}. Podés cambiar los filtros o restablecerlos.`} action={{ label: "Restablecer filtros", onClick: resetFilters }} />
            ) : null}
            <AnalyticsInsights data={payload.data} filters={filters} />
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
