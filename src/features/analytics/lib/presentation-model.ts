type RankableGeographyGroup = {
  kind: string;
  id: string;
  name?: string;
  totalEvents: number;
};

export type ObservedCountryRank = {
  id: string;
  name: string;
  totalEvents: number;
};

export function getObservedCountryRanking(
  groups: readonly RankableGeographyGroup[],
  limit = 5,
): ObservedCountryRank[] {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError("El límite del ranking debe ser un entero positivo.");
  }

  return groups
    .filter((group) => group.kind === "country" && group.name && group.totalEvents > 0)
    .map((group) => ({
      id: group.id,
      name: group.name as string,
      totalEvents: group.totalEvents,
    }))
    .sort((first, second) =>
      second.totalEvents - first.totalEvents || first.name.localeCompare(second.name),
    )
    .slice(0, limit);
}

export function getNiceCountTicks(maximumCount: number): number[] {
  if (!Number.isFinite(maximumCount) || maximumCount < 0) {
    throw new RangeError("El máximo del eje debe ser un número finito no negativo.");
  }
  if (maximumCount === 0) return [0, 1];

  const roughStep = maximumCount / 4;
  const power = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / power;
  const niceFraction = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceFraction * power;
  const upperBound = Math.ceil(maximumCount / step) * step;
  const tickCount = Math.round(upperBound / step);

  return Array.from({ length: tickCount + 1 }, (_, index) => Number((index * step).toPrecision(12)));
}
