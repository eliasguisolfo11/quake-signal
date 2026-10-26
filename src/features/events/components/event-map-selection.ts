import { gsap } from "gsap";
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import type { QuakeEvent } from "../lib/types";
import { MAGNITUDE_BANDS, magnitudeBandKey } from "../lib/event-filters";

const FALLBACK_MAGNITUDE_COLOR = "#929aa5";

type SelectionMarker = {
  eventId: string;
  marker: MapLibreMarker;
  button: HTMLButtonElement;
  echo: HTMLSpanElement;
};

type CameraTarget = {
  center: [number, number];
  zoom: number;
  duration: number;
};

type EventMapSelectionController = {
  update: (
    map: MapLibreMap | null,
    events: QuakeEvent[],
    selectedEventId: string | null,
    onSelect: (eventId: string) => void,
  ) => void;
  dispose: () => void;
};

export function colorForMagnitude(magnitude: number | null): string {
  const bandKey = magnitudeBandKey(magnitude);
  return (
    MAGNITUDE_BANDS.find((band) => band.key === bandKey)?.color ??
    FALLBACK_MAGNITUDE_COLOR
  );
}

export function moveMap(map: MapLibreMap, target: CameraTarget): void {
  const { duration, ...camera } = target;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    map.jumpTo(camera);
    return;
  }

  map.easeTo({ ...camera, duration });
}

function describeSelection(event: QuakeEvent): string {
  const magnitude =
    event.magnitude === null
      ? "magnitud no disponible"
      : `magnitud ${event.magnitude.toFixed(1)}`;
  const place = event.place ?? "ubicación no disponible";

  return `Ver detalle del epicentro seleccionado: ${magnitude}, ${place}`;
}

function createSelectionButton(): {
  button: HTMLButtonElement;
  echo: HTMLSpanElement;
} {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quake-selection-marker";

  const echo = document.createElement("span");
  echo.className = "quake-selection-marker__echo";
  echo.setAttribute("aria-hidden", "true");
  button.append(echo);

  return { button, echo };
}

export function createEventMapSelectionController(): EventMapSelectionController {
  let selection: SelectionMarker | null = null;
  let selectionMedia: ReturnType<typeof gsap.matchMedia> | null = null;
  let lastAnimatedSelectionId: string | null = null;

  const clearSelection = () => {
    selectionMedia?.revert();
    selectionMedia = null;
    selection?.marker.remove();
    selection = null;
  };

  return {
    update(map, events, selectedEventId, onSelect) {
      if (!selectedEventId) {
        clearSelection();
        lastAnimatedSelectionId = null;
        return;
      }

      const event = events.find((item) => item.id === selectedEventId);
      if (!event?.coordinates) {
        clearSelection();
        return;
      }

      if (!map) {
        return;
      }

      const isNewSelection = selection?.eventId !== event.id;
      if (isNewSelection) {
        clearSelection();

        const { button, echo } = createSelectionButton();
        const marker = new MapLibreMarker({ element: button, anchor: "center" })
          .setLngLat([event.coordinates.longitude, event.coordinates.latitude])
          .addTo(map);
        selection = { eventId: event.id, marker, button, echo };

        moveMap(map, {
          center: [event.coordinates.longitude, event.coordinates.latitude],
          zoom: Math.max(map.getZoom(), 4),
          duration: 500,
        });

        if (lastAnimatedSelectionId !== event.id) {
          const media = gsap.matchMedia();
          media.add("(prefers-reduced-motion: no-preference)", () => {
            gsap.fromTo(
              echo,
              { scale: 0.45, opacity: 0.72 },
              { scale: 3.2, opacity: 0, duration: 0.82, ease: "power2.out" },
            );
          });
          selectionMedia = media;
          lastAnimatedSelectionId = event.id;
        }
      }

      if (!selection) {
        return;
      }

      selection.marker.setLngLat([event.coordinates.longitude, event.coordinates.latitude]);
      selection.button.style.setProperty(
        "--quake-marker-color",
        colorForMagnitude(event.magnitude),
      );
      selection.button.setAttribute("aria-label", describeSelection(event));
      selection.button.onclick = () => onSelect(event.id);
    },
    dispose() {
      clearSelection();
      lastAnimatedSelectionId = null;
    },
  };
}
