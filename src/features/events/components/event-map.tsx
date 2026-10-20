"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { QuakeEvent } from "../lib/types";
import { MAGNITUDE_BANDS, magnitudeBandKey } from "../lib/event-filters";

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const SOURCE_ID = "quakesignal-events";
const MISSING_CITY_ICON_ID = "circle-11";

setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

function createFallbackCityIcon(): ImageData {
  const size = 12;
  const image = new ImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2);
      if (distance > 3.5) {
        continue;
      }

      const offset = (y * size + x) * 4;
      image.data[offset] = 146;
      image.data[offset + 1] = 154;
      image.data[offset + 2] = 165;
      image.data[offset + 3] = 255;
    }
  }

  return image;
}

type EventMapProps = {
  events: QuakeEvent[];
  selectedEventId: string | null;
  onSelect: (eventId: string) => void;
  onError: () => void;
};

function toFeatureCollection(events: QuakeEvent[], selectedEventId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: events.flatMap((event) => {
      if (!event.coordinates) {
        return [];
      }

      return [
        {
          type: "Feature" as const,
          id: event.id,
          geometry: {
            type: "Point" as const,
            coordinates: [event.coordinates.longitude, event.coordinates.latitude],
          },
          properties: {
            eventId: event.id,
            magnitude: event.magnitude,
            band: magnitudeBandKey(event.magnitude),
            selected: event.id === selectedEventId,
          },
        },
      ];
    }),
  };
}

export function EventMap({
  events,
  selectedEventId,
  onSelect,
  onError,
}: EventMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latestData = useRef(toFeatureCollection(events, selectedEventId));
  const [isReady, setIsReady] = useState(false);
  const data = useMemo(
    () => toFeatureCollection(events, selectedEventId),
    [events, selectedEventId],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let loaded = false;
    let errorReported = false;
    let fallbackCityIconAdded = false;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: [0, 18],
      zoom: 1.15,
      minZoom: 1,
      maxZoom: 18,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.setMissingStyleImageResolver((imageId) => {
      if (imageId === MISSING_CITY_ICON_ID && !fallbackCityIconAdded) {
        fallbackCityIconAdded = true;
        map.addImage(imageId, createFallbackCityIcon());
      }
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const failMap = () => {
      if (errorReported) {
        return;
      }

      errorReported = true;
      onError();
    };
    const loadTimeout = window.setTimeout(() => {
      if (!loaded) {
        failMap();
      }
    }, 15_000);

    map.on("error", () => {
      if (!loaded) {
        failMap();
      }
    });

    map.once("load", () => {
      loaded = true;
      window.clearTimeout(loadTimeout);

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: latestData.current,
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 11,
      });
      map.addLayer({
        id: "quake-clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#252d34",
          "circle-radius": ["step", ["get", "point_count"], 15, 20, 19, 80, 24],
          "circle-stroke-color": "#83909b",
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "quake-cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: { "text-color": "#f1f3f5" },
      });
      map.addLayer({
        id: "quake-events",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "band"],
            "under-2",
            "#62bfb5",
            "2-to-3",
            "#77b8a9",
            "3-to-4",
            "#a6bd87",
            "4-to-5",
            "#e5b653",
            "5-to-6",
            "#e5a05c",
            "6-to-7",
            "#ef7862",
            "7-plus",
            "#d15b69",
            "#929aa5",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "magnitude"], 0],
            0,
            4,
            7,
            11,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["get", "selected"], false],
            "#f1f3f5",
            "#0b0d10",
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["get", "selected"], false],
            2,
            1,
          ],
          "circle-opacity": 0.96,
        },
      });

      map.on("click", "quake-clusters", async (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const point = feature?.geometry;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;

        if (
          typeof clusterId !== "number" ||
          !source ||
          !point ||
          point.type !== "Point"
        ) {
          return;
        }

        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: point.coordinates as [number, number],
            zoom,
            duration: 450,
          });
        } catch {
          return;
        }
      });

      map.on("click", "quake-events", (event) => {
        const eventId = event.features?.[0]?.properties?.eventId;
        if (typeof eventId === "string") {
          onSelect(eventId);
        }
      });

      map.on("mouseenter", "quake-clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "quake-clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "quake-events", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "quake-events", () => {
        map.getCanvas().style.cursor = "";
      });

      setIsReady(true);
    });

    return () => {
      window.clearTimeout(loadTimeout);
      map.remove();
      mapRef.current = null;
    };
  }, [onError, onSelect]);

  useEffect(() => {
    latestData.current = data;
    const source = mapRef.current?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(data);
  }, [data]);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    const event = events.find((item) => item.id === selectedEventId);
    if (!event?.coordinates) {
      return;
    }

    mapRef.current?.easeTo({
      center: [event.coordinates.longitude, event.coordinates.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 4),
      duration: 500,
    });
  }, [events, selectedEventId]);

  return (
    <div className="map-canvas-wrap">
      <div
        ref={containerRef}
        className="map-canvas"
        role="region"
        aria-label="Mapa de epicentros. Los mismos eventos están disponibles en la lista."
      />
      {!isReady && (
        <div className="map-loading" role="status">
          Cargando mapa
        </div>
      )}
      <div className="map-legend" aria-label="Rangos de magnitud del mapa">
        {MAGNITUDE_BANDS.map((band) => (
          <span className="map-legend-item" key={band.key}>
            <span aria-hidden="true" style={{ backgroundColor: band.color }} />
            {band.label}
          </span>
        ))}
      </div>
      <p className="map-attribution">
        © OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors
      </p>
    </div>
  );
}
