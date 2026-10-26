import { Map as MapLibreMap } from "maplibre-gl";
import type { ExpressionSpecification } from "maplibre-gl";

export const EVENT_PULSE_GROUP_COUNT = 3;

const PULSE_WAVE_COUNT = 2;
const PULSE_PERIOD_MS = 5_400;
const PULSE_DURATION_MS = 1_350;
const PULSE_WAVE_GAP_MS = 380;
const PULSE_OFFSET_MS = PULSE_PERIOD_MS / EVENT_PULSE_GROUP_COUNT;
const PULSE_FRAME_INTERVAL_MS = 1_000 / 24;
const MINIMUM_RADIUS_OFFSET = 6;
const MAXIMUM_RADIUS_OFFSET = 14;
const WAVE_RADIUS_OFFSET = 4;
const MAXIMUM_STROKE_OPACITY = [0.32, 0.2] as const;

function pulseLayerId(group: number, wave: number): string {
  return `quake-event-pulse-${group}-${wave}`;
}

function baseRadiusExpression(): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "magnitude"], 0],
    0,
    4,
    7,
    11,
  ] as ExpressionSpecification;
}

function radiusExpression(offset: number): ExpressionSpecification {
  return ["+", baseRadiusExpression(), offset] as ExpressionSpecification;
}

export function eventPulseGroup(eventId: string): number {
  let hash = 0;

  for (let index = 0; index < eventId.length; index += 1) {
    hash = (Math.imul(hash, 31) + eventId.charCodeAt(index)) >>> 0;
  }

  return hash % EVENT_PULSE_GROUP_COUNT;
}

export function addEventPulseLayers(map: MapLibreMap, sourceId: string): void {
  for (let group = 0; group < EVENT_PULSE_GROUP_COUNT; group += 1) {
    for (let wave = 0; wave < PULSE_WAVE_COUNT; wave += 1) {
      map.addLayer({
        id: pulseLayerId(group, wave),
        type: "circle",
        source: sourceId,
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "pulseGroup"], group],
        ],
        paint: {
          "circle-color": "#000000",
          "circle-opacity": 0,
          "circle-radius": radiusExpression(
            MINIMUM_RADIUS_OFFSET + wave * WAVE_RADIUS_OFFSET,
          ),
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0,
        },
      });
    }
  }
}

export function startEventPulses(map: MapLibreMap): () => void {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionPreference.matches;
  let frameId: number | null = null;
  let elapsed = 0;
  let previousTimestamp: number | null = null;
  let previousPaintTimestamp = -Infinity;
  let disposed = false;

  const resetPulses = () => {
    for (let group = 0; group < EVENT_PULSE_GROUP_COUNT; group += 1) {
      for (let wave = 0; wave < PULSE_WAVE_COUNT; wave += 1) {
        const layerId = pulseLayerId(group, wave);
        if (!map.getLayer(layerId)) {
          continue;
        }

        map.setPaintProperty(layerId, "circle-stroke-opacity", 0);
        map.setPaintProperty(
          layerId,
          "circle-radius",
          radiusExpression(MINIMUM_RADIUS_OFFSET + wave * WAVE_RADIUS_OFFSET),
        );
      }
    }
  };

  const stopFrame = () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  const animate = (timestamp: number) => {
    frameId = null;
    if (disposed || reducedMotion || document.visibilityState !== "visible") {
      return;
    }

    if (previousTimestamp !== null) {
      elapsed += timestamp - previousTimestamp;
    }
    previousTimestamp = timestamp;

    if (timestamp - previousPaintTimestamp >= PULSE_FRAME_INTERVAL_MS) {
      previousPaintTimestamp = timestamp;

      for (let group = 0; group < EVENT_PULSE_GROUP_COUNT; group += 1) {
        for (let wave = 0; wave < PULSE_WAVE_COUNT; wave += 1) {
          const phase =
            (((elapsed -
              group * PULSE_OFFSET_MS -
              wave * PULSE_WAVE_GAP_MS) %
              PULSE_PERIOD_MS) +
              PULSE_PERIOD_MS) %
            PULSE_PERIOD_MS;
          const isActive = phase < PULSE_DURATION_MS;
          const progress = isActive ? phase / PULSE_DURATION_MS : 0;
          const radiusOffset = isActive
            ? MINIMUM_RADIUS_OFFSET +
              wave * WAVE_RADIUS_OFFSET +
              progress * (MAXIMUM_RADIUS_OFFSET - MINIMUM_RADIUS_OFFSET)
            : MINIMUM_RADIUS_OFFSET + wave * WAVE_RADIUS_OFFSET;
          const opacity = isActive
            ? MAXIMUM_STROKE_OPACITY[wave] * (1 - progress)
            : 0;
          const layerId = pulseLayerId(group, wave);

          map.setPaintProperty(layerId, "circle-radius", radiusExpression(radiusOffset));
          map.setPaintProperty(layerId, "circle-stroke-opacity", opacity);
        }
      }
    }

    frameId = window.requestAnimationFrame(animate);
  };

  const start = () => {
    if (
      !disposed &&
      !reducedMotion &&
      document.visibilityState === "visible" &&
      frameId === null
    ) {
      previousTimestamp = null;
      frameId = window.requestAnimationFrame(animate);
    }
  };

  const handleMotionPreference = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
    stopFrame();
    previousTimestamp = null;

    if (reducedMotion) {
      resetPulses();
    } else {
      start();
    }
  };

  const handleVisibility = () => {
    stopFrame();
    previousTimestamp = null;

    if (document.visibilityState === "visible") {
      start();
    } else {
      resetPulses();
    }
  };

  motionPreference.addEventListener("change", handleMotionPreference);
  document.addEventListener("visibilitychange", handleVisibility);

  if (reducedMotion) {
    resetPulses();
  } else {
    start();
  }

  return () => {
    disposed = true;
    stopFrame();
    motionPreference.removeEventListener("change", handleMotionPreference);
    document.removeEventListener("visibilitychange", handleVisibility);
    resetPulses();
  };
}
