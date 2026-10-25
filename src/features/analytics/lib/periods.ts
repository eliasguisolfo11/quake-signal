export const ANALYTICS_PERIODS = ["30d", "12m", "5y"] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export type AnalyticsWindow = {
  startInclusive: string;
  endExclusive: string;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function subtractCalendarMonths(date: Date, amount: number): Date {
  const day = date.getUTCDate();
  const targetMonth = date.getUTCMonth() - amount;
  const target = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      targetMonth,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
  const lastDayOfMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();

  target.setUTCDate(Math.min(day, lastDayOfMonth));
  return target;
}

export function createAnalyticsWindow(
  period: AnalyticsPeriod,
  now: Date,
): AnalyticsWindow {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("El instante de consulta no es una fecha válida.");
  }

  let start: Date;

  switch (period) {
    case "30d":
      start = new Date(now.getTime() - 30 * DAY_IN_MS);
      break;
    case "12m":
      start = subtractCalendarMonths(now, 12);
      break;
    case "5y":
      start = subtractCalendarMonths(now, 60);
      break;
    default:
      throw new RangeError("El período de análisis no es válido.");
  }

  return {
    startInclusive: start.toISOString(),
    endExclusive: now.toISOString(),
  };
}

export function toFdsnInclusiveEnd(endExclusive: string): string {
  const end = new Date(endExclusive);
  if (Number.isNaN(end.getTime())) {
    throw new RangeError("El límite final del período no es válido.");
  }

  end.setTime(end.getTime() - 1);
  return end.toISOString();
}
