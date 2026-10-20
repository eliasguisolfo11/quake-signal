import type { Continent, QuakeEvent } from "./types";

export const MAGNITUDE_BANDS = [
  { key: "under-2", label: "m < 2,0", color: "#62bfb5", min: -Infinity, max: 2 },
  { key: "2-to-3", label: "2,0 ≤ m < 3,0", color: "#77b8a9", min: 2, max: 3 },
  { key: "3-to-4", label: "3,0 ≤ m < 4,0", color: "#a6bd87", min: 3, max: 4 },
  { key: "4-to-5", label: "4,0 ≤ m < 5,0", color: "#e5b653", min: 4, max: 5 },
  { key: "5-to-6", label: "5,0 ≤ m < 6,0", color: "#e5a05c", min: 5, max: 6 },
  { key: "6-to-7", label: "6,0 ≤ m < 7,0", color: "#ef7862", min: 6, max: 7 },
  { key: "7-plus", label: "m ≥ 7,0", color: "#d15b69", min: 7, max: Infinity },
] as const;

export function magnitudeBandKey(magnitude: number | null): string {
  if (magnitude === null) {
    return "unknown";
  }

  return (
    MAGNITUDE_BANDS.find(
      (band) => magnitude >= band.min && magnitude < band.max,
    )?.key ?? "unknown"
  );
}

export function filterEvents(
  events: QuakeEvent[],
  options: { minMagnitude: number | null; continent: Continent | "world" },
): QuakeEvent[] {
  return events
    .filter((event) => {
      if (options.minMagnitude !== null) {
        if (event.magnitude === null || event.magnitude < options.minMagnitude) {
          return false;
        }
      }

      return options.continent === "world" || event.continent === options.continent;
    })
    .sort((first, second) => second.originTime.localeCompare(first.originTime));
}

export function summarizeEvents(events: QuakeEvent[]): {
  count: number;
  maxMagnitude: number | null;
} {
  let maxMagnitude: number | null = null;

  for (const event of events) {
    if (event.magnitude !== null && (maxMagnitude === null || event.magnitude > maxMagnitude)) {
      maxMagnitude = event.magnitude;
    }
  }

  return { count: events.length, maxMagnitude };
}
