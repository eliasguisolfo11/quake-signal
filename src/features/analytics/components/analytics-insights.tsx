"use client";

import type { AnalyticsData } from "../lib/contracts";
import type { AnalyticsFilters } from "../lib/contracts";
import { AnalyticsCountryExplorer } from "./analytics-country-explorer";
import { AnalyticsCharts } from "./analytics-charts";

function formatCount(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);
}

function formatMagnitude(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatMedianMagnitude(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value);
}

export function AnalyticsInsights({ data, filters }: { data: AnalyticsData; filters: AnalyticsFilters }) {
  const { summary } = data;
  return (
    <div className="analytics-overview">
      <section aria-label="Indicadores del período">
        <dl className="analytics-kpi-strip">
          <div>
            <dt>Eventos registrados</dt>
            <dd>{formatCount(summary.totalEvents)}</dd>
          </div>
          <div>
            <dt>Magnitud máxima</dt>
            <dd>{formatMagnitude(summary.maximumMagnitude)} <span>M</span></dd>
          </div>
          <div>
            <dt>Mediana de magnitud</dt>
            <dd>{formatMedianMagnitude(summary.medianMagnitude)} <span>M</span></dd>
          </div>
        </dl>
      </section>
      <AnalyticsCountryExplorer geography={data.geography} filters={filters} />
      <AnalyticsCharts data={data} period={filters.period} />
    </div>
  );
}
