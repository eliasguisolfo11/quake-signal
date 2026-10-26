"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { AnalyticsFilters } from "../lib/contracts";
import type { CountryGroup, GeographicGroup, UnassignedGroup } from "../lib/country-analytics";
import { CountryProfile } from "./country-profile";

const COUNT_FORMATTER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const CountryActivityMap = dynamic(
  () => import("./country-activity-map").then((module) => module.CountryActivityMap),
  {
    ssr: false,
    loading: () => (
      <div className="analytics-country-map-loading" role="status" aria-label="Cargando mapa">
        Cargando mapa…
      </div>
    ),
  },
);

function countryGroups(groups: readonly GeographicGroup[]): CountryGroup[] {
  return groups.filter((group): group is CountryGroup => group.kind === "country");
}

function rankingRows(groups: readonly CountryGroup[], maximum: number) {
  return groups.slice(0, 5).map((group, index) => ({
    group,
    index,
    share: maximum > 0 ? group.totalEvents / maximum * 100 : 0,
  }));
}

export function AnalyticsCountryExplorer({
  geography,
  filters,
}: {
  geography: { groups: GeographicGroup[] };
  filters: AnalyticsFilters;
}) {
  const groups = useMemo(() => countryGroups(geography.groups), [geography.groups]);
  const activeGroups = useMemo(
    () => groups.filter(({ totalEvents }) => totalEvents > 0),
    [groups],
  );
  const [requestedCountryId, setRequestedCountryId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(true);
  const selectedGroup = isProfileOpen
    ? groups.find(({ countryId }) => countryId === requestedCountryId) ?? activeGroups[0] ?? null
    : null;
  const [mapError, setMapError] = useState(false);
  const ranking = rankingRows(activeGroups, activeGroups[0]?.totalEvents ?? 0);
  const unassigned = useMemo(
    () => geography.groups.filter(
      (group): group is UnassignedGroup => group.kind !== "country" && group.totalEvents > 0,
    ),
    [geography.groups],
  );
  const selectCountry = (countryId: string | null) => {
    setRequestedCountryId(countryId);
    setIsProfileOpen(countryId !== null);
  };
  const closeCountryProfile = () => {
    setRequestedCountryId(null);
    setIsProfileOpen(false);
  };

  return (
    <section className="analytics-country-explorer" aria-labelledby="analytics-country-explorer-title">
      <div className="analytics-explorer-heading">
        <div>
          <p className="analytics-eyebrow">GEOGRAFÍA OBSERVADA</p>
          <h2 id="analytics-country-explorer-title">Dónde se registran los sismos</h2>
          <p>Conteos del catálogo por país y período. Explorá el mapa o seleccioná una zona.</p>
        </div>
        <label className="analytics-country-select">
          <span>Ir a un país</span>
          <select
            aria-label="Seleccionar país para ver su ficha"
            value={selectedGroup?.countryId ?? ""}
            onChange={(event) => selectCountry(event.target.value || null)}
          >
            <option value="">Seleccioná un país</option>
            {activeGroups.map(({ countryId, name }) => (
              <option key={countryId} value={countryId}>{name}</option>
            ))}
            {groups.filter(({ totalEvents }) => totalEvents === 0).map(({ countryId, name }) => (
              <option key={countryId} value={countryId}>{name} · sin eventos</option>
            ))}
          </select>
        </label>
      </div>

      <div className="analytics-explorer-grid">
        <section className="analytics-explorer-map-panel" aria-label="Mapa y actividad por país">
          <div className="analytics-panel-heading">
            <div>
              <p className="analytics-eyebrow">MAPA DE ACTIVIDAD</p>
              <h3>Epicentros asignados a tierra</h3>
              <p>Seleccioná un país en el mapa o en el ranking</p>
            </div>
            <span className="analytics-panel-unit">USGS</span>
          </div>
          {mapError ? (
            <div className="analytics-country-map-fallback" role="status">
              <strong>El mapa no está disponible en este momento.</strong>
              <span>El ranking y las fichas de zona siguen disponibles.</span>
              <button type="button" className="analytics-text-action" onClick={() => setMapError(false)}>Reintentar mapa</button>
            </div>
          ) : (
            <CountryActivityMap
              groups={geography.groups}
              selectedCountryId={selectedGroup?.countryId ?? null}
              onSelectCountry={selectCountry}
              onError={() => setMapError(true)}
            />
          )}
          <div className="analytics-country-map-legend" aria-label="Intensidad del mapa, de menos a más eventos">
            <span>Menos</span>
            <i className="level-1" /><i className="level-2" /><i className="level-3" /><i className="level-4" /><i className="level-5" />
            <span>Más</span>
          </div>
          <p className="analytics-map-method-note">El color representa la cantidad observada en este período, no el nivel de peligro.</p>
          <p className="analytics-map-attribution">© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors</p>
          <a className="analytics-map-source" href="https://www.usgs.gov/programs/earthquake-hazards/earthquakes" target="_blank" rel="noreferrer">Datos de actividad: USGS ↗</a>
        </section>

        <section className="analytics-explorer-ranking" aria-labelledby="analytics-country-ranking-title">
          <div className="analytics-panel-heading">
            <div>
              <p className="analytics-eyebrow">TOP 5 · PAÍSES</p>
              <h3 id="analytics-country-ranking-title">Más eventos registrados</h3>
              <p>Ordenado por conteo dentro del período</p>
            </div>
          </div>
          {ranking.length === 0 ? (
            <p className="analytics-chart-empty">No hay eventos asignados a países en este período.</p>
          ) : (
            <ol className="analytics-country-ranking-list">
              {ranking.map(({ group, index, share }) => (
                <li key={group.countryId}>
                  <button
                    className={`analytics-country-rank${group.countryId === selectedGroup?.countryId ? " is-selected" : ""}`}
                    type="button"
                    aria-pressed={group.countryId === selectedGroup?.countryId}
                    onClick={() => selectCountry(group.countryId)}
                  >
                    <span className="analytics-country-rank-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="analytics-country-rank-main">
                      <span className="analytics-country-rank-copy"><strong>{group.name}</strong><span>{group.continent}</span></span>
                      <span className="analytics-country-rank-track" aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
                    </span>
                    <output>{COUNT_FORMATTER.format(group.totalEvents)}</output>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <p className="analytics-ranking-method-note">Se asigna cada epicentro al país que lo contiene. Los eventos oceánicos y las ubicaciones sin asignación se informan por separado.</p>
        </section>
      </div>

      {selectedGroup ? (
        <CountryProfile
          key={selectedGroup.countryId}
          group={selectedGroup}
          period={filters.period}
          onClose={closeCountryProfile}
        />
      ) : null}

      {unassigned.length > 0 ? (
        <details className="analytics-unassigned-details">
          <summary>Eventos no asignados a un país</summary>
          <ul>{unassigned.map((group) => (
            <li key={group.id}><span>{group.label}</span><output>{COUNT_FORMATTER.format(group.totalEvents)}</output></li>
          ))}</ul>
        </details>
      ) : null}
    </section>
  );
}
