import type { AnalyticsData } from "../lib/contracts";
import { getNiceCountTicks, getObservedCountryRanking } from "../lib/presentation-model";

const COUNT_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function formatCount(value: number): string {
  return COUNT_FORMATTER.format(value);
}

function formatBucketDate(value: string, period: "30d" | "12m" | "5y"): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-AR", period === "30d"
    ? { day: "2-digit", month: "short", timeZone: "UTC" }
    : { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
}

function ActivityChart({ data, period }: { data: AnalyticsData; period: "30d" | "12m" | "5y" }) {
  const buckets = data.summary.timeSeries;
  const width = 880;
  const height = 260;
  const plot = { left: 62, right: 18, top: 14, bottom: 218 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = plot.bottom - plot.top;
  const maximum = Math.max(0, ...buckets.map(({ count }) => count));
  const ticks = getNiceCountTicks(maximum);
  const chartMaximum = ticks.at(-1) ?? 1;
  const slotWidth = buckets.length > 0 ? plotWidth / buckets.length : plotWidth;
  const barWidth = Math.max(1, slotWidth * 0.68);
  const labelCount = Math.min(5, buckets.length);
  const labelIndexes = Array.from({ length: labelCount }, (_, index) =>
    labelCount === 1 ? 0 : Math.round(index * (buckets.length - 1) / (labelCount - 1)),
  );
  const description = maximum === 0
    ? "No hubo eventos registrados en los intervalos mostrados."
    : `Gráfico de barras con ${formatCount(data.summary.totalEvents)} eventos registrados; el intervalo con mayor actividad tiene ${formatCount(maximum)}.`;

  return (
    <section className="analytics-panel analytics-activity-panel" aria-labelledby="analytics-activity-title">
      <div className="analytics-panel-heading">
        <div>
          <p className="analytics-eyebrow">EVOLUCIÓN OBSERVADA</p>
          <h2 id="analytics-activity-title">Eventos por intervalo</h2>
          <p>{period === "30d" ? "Conteo diario" : "Conteo mensual"} · fechas UTC</p>
        </div>
        <span className="analytics-panel-unit">eventos</span>
      </div>
      <div className="analytics-chart-wrap">
        <svg className="analytics-activity-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="analytics-chart-title analytics-chart-description">
          <title id="analytics-chart-title">Actividad sísmica registrada por intervalo</title>
          <desc id="analytics-chart-description">{description}</desc>
          {ticks.map((tick) => {
            const y = plot.bottom - tick / chartMaximum * plotHeight;
            return (
              <g key={tick}>
                <line className="analytics-chart-grid" x1={plot.left} x2={width - plot.right} y1={y} y2={y} />
                <text className="analytics-chart-tick" x={plot.left - 10} y={y + 4} textAnchor="end">{formatCount(tick)}</text>
              </g>
            );
          })}
          {buckets.map((bucket, index) => {
            const barHeight = bucket.count / chartMaximum * plotHeight;
            return (
              <rect
                className="analytics-chart-bar"
                key={bucket.bucketStart}
                x={plot.left + index * slotWidth + (slotWidth - barWidth) / 2}
                y={plot.bottom - barHeight}
                width={barWidth}
                height={barHeight}
                rx="1"
              >
                <title>{formatBucketDate(bucket.bucketStart, period)}: {formatCount(bucket.count)} eventos</title>
              </rect>
            );
          })}
          {labelIndexes.map((index) => {
            const bucket = buckets[index];
            if (!bucket) return null;
            const x = plot.left + index * slotWidth + slotWidth / 2;
            return (
              <text className="analytics-chart-tick analytics-chart-date" key={bucket.bucketStart} x={x} y={plot.bottom + 25} textAnchor="middle">
                {formatBucketDate(bucket.bucketStart, period)}
              </text>
            );
          })}
        </svg>
      </div>
      <details className="analytics-data-table-details">
        <summary>Ver valores por intervalo en tabla</summary>
        <div className="analytics-data-table-scroll">
          <table>
            <thead><tr><th scope="col">Intervalo (UTC)</th><th scope="col">Eventos</th></tr></thead>
            <tbody>{buckets.map((bucket) => (
              <tr key={bucket.bucketStart}>
                <th scope="row">{formatBucketDate(bucket.bucketStart, period)}</th>
                <td>{formatCount(bucket.count)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function DistributionPanel({
  title,
  eyebrow,
  description,
  buckets,
}: {
  title: string;
  eyebrow: string;
  description: string;
  buckets: Array<{ key: string; label: string; count: number }>;
}) {
  const maximum = Math.max(0, ...buckets.map(({ count }) => count));
  return (
    <section className="analytics-panel analytics-distribution-panel" aria-label={title}>
      <div className="analytics-panel-heading">
        <div>
          <p className="analytics-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="analytics-panel-unit">eventos</span>
      </div>
      <ol className="analytics-bar-list">
        {buckets.map((bucket) => (
          <li className="analytics-bar-row" key={bucket.key}>
            <span className="analytics-bar-label">{bucket.label}</span>
            <span className="analytics-bar-track" aria-hidden="true">
              <span className="analytics-bar-fill" style={{ width: `${maximum === 0 ? 0 : bucket.count / maximum * 100}%` }} />
            </span>
            <output className="analytics-bar-count" aria-label={`${bucket.label}: ${formatCount(bucket.count)} eventos`}>
              {formatCount(bucket.count)}
            </output>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GeographyPanel({ geography }: { geography: AnalyticsData["geography"] }) {
  const ranking = getObservedCountryRanking(geography.groups);
  const unassigned = geography.groups.flatMap((group) =>
    group.kind === "country" || group.totalEvents === 0
      ? []
      : [{ id: group.id, label: group.label, totalEvents: group.totalEvents }],
  );
  const maximum = Math.max(0, ...ranking.map(({ totalEvents }) => totalEvents));
  const unassignedTotal = unassigned.reduce((total, group) => total + group.totalEvents, 0);
  const countryTotal = ranking.length === 0
    ? 0
    : geography.groups.reduce((total, group) => total + (group.kind === "country" ? group.totalEvents : 0), 0);

  return (
    <section className="analytics-panel analytics-geography-panel" aria-labelledby="analytics-geography-title">
      <div className="analytics-panel-heading">
        <div>
          <p className="analytics-eyebrow">DISTRIBUCIÓN GEOGRÁFICA</p>
          <h2 id="analytics-geography-title">Dónde se registró actividad</h2>
          <p>País asignado por epicentro · conteos observados</p>
        </div>
        <span className="analytics-panel-unit">top 5</span>
      </div>
      {ranking.length > 0 ? (
        <ol className="analytics-country-list">
          {ranking.map((country, index) => (
            <li className="analytics-country-row" key={country.id}>
              <span className="analytics-country-position">{String(index + 1).padStart(2, "0")}</span>
              <span className="analytics-country-name">{country.name}</span>
              <span className="analytics-country-track" aria-hidden="true">
                <span style={{ width: `${country.totalEvents / maximum * 100}%` }} />
              </span>
              <output className="analytics-country-count" aria-label={`${country.name}: ${formatCount(country.totalEvents)} eventos`}>
                {formatCount(country.totalEvents)}
              </output>
            </li>
          ))}
        </ol>
      ) : (
        <p className="analytics-chart-empty">No hay eventos atribuidos a países en esta consulta.</p>
      )}
      <div className="analytics-geography-footnote">
        <span>{formatCount(countryTotal)} asignados a países</span>
        <span>{formatCount(unassignedTotal)} en grupos sin país</span>
      </div>
      {unassigned.length > 0 ? (
        <details className="analytics-unassigned-details">
          <summary>Ver eventos sin país asignado ({formatCount(unassignedTotal)})</summary>
          <ul>
            {unassigned.map((group) => (
              <li key={group.id}><span>{group.label}</span><output>{formatCount(group.totalEvents)}</output></li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

export function AnalyticsCharts({ data, period }: { data: AnalyticsData; period: "30d" | "12m" | "5y" }) {
  return (
    <div className="analytics-visualizations">
      <ActivityChart data={data} period={period} />
      <div className="analytics-distribution-grid">
        <DistributionPanel
          title="Por magnitud"
          eyebrow="TAMAÑO DEL EVENTO"
          description="Bandas del catálogo USGS · Mw"
          buckets={data.summary.magnitudeDistribution}
        />
        <DistributionPanel
          title="Por profundidad"
          eyebrow="PROFUNDIDAD DEL FOCO"
          description="Clases en kilómetros"
          buckets={data.summary.depthDistribution}
        />
      </div>
      <GeographyPanel geography={data.geography} />
      <p className="analytics-observed-note">Las frecuencias describen los eventos registrados en el intervalo consultado; no son una predicción de sismos futuros.</p>
    </div>
  );
}
