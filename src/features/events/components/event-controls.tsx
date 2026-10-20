import {
  CONTINENTS,
  type Continent,
  type EventPeriod,
} from "../lib/types";
import { CONTINENT_LABELS, PERIOD_LABELS } from "../lib/event-labels";

type EventControlsProps = {
  mode: "monitor" | "history";
  period: EventPeriod;
  isLoading: boolean;
  minimumMagnitude: string;
  magnitudeError: boolean;
  continent: Continent | "world";
  hasFilters: boolean;
  onPeriodChange: (period: EventPeriod) => void;
  onMinimumMagnitudeChange: (value: string) => void;
  onContinentChange: (continent: Continent | "world") => void;
  onClearFilters: () => void;
};

export function EventControls({
  mode,
  period,
  isLoading,
  minimumMagnitude,
  magnitudeError,
  continent,
  hasFilters,
  onPeriodChange,
  onMinimumMagnitudeChange,
  onContinentChange,
  onClearFilters,
}: EventControlsProps) {
  return (
    <section className="filter-bar" aria-label="Filtros de eventos">
      {mode === "monitor" && (
        <fieldset className="period-control">
          <legend>Período</legend>
          <div className="period-options">
            {(["hour", "day", "week"] as const).map((option) => (
              <button
                className={period === option ? "period-button is-active" : "period-button"}
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => onPeriodChange(option)}
                disabled={isLoading && period === option}
              >
                {PERIOD_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <label className="filter-field magnitude-filter">
        <span>Magnitud mínima</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={minimumMagnitude}
          aria-invalid={magnitudeError}
          aria-describedby="magnitude-help"
          onChange={(event) => onMinimumMagnitudeChange(event.currentTarget.value)}
        />
        <span
          className={magnitudeError ? "input-help input-help--error" : "sr-only"}
          id="magnitude-help"
          aria-live={magnitudeError ? "polite" : undefined}
        >
          {magnitudeError
            ? "Usá incrementos de 0,1, por ejemplo 2,5."
            : "Usá incrementos de 0,1. Los eventos sin magnitud se excluyen al activar este filtro."}
        </span>
      </label>

      <label className="filter-field region-filter">
        <span>Continente</span>
        <select
          value={continent}
          onChange={(event) =>
            onContinentChange(event.currentTarget.value as Continent | "world")
          }
        >
          <option value="world">Todo el mundo</option>
          {CONTINENTS.map((item) => (
            <option value={item} key={item}>
              {CONTINENT_LABELS[item]}
            </option>
          ))}
        </select>
      </label>

      <button
        className="clear-filters"
        type="button"
        onClick={onClearFilters}
        disabled={!hasFilters}
      >
        Limpiar filtros
      </button>
    </section>
  );
}
