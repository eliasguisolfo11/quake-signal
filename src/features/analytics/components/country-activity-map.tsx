"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import type { ExpressionSpecification, GeoJSONSource } from "maplibre-gl";
import type { GeographicGroup } from "../lib/country-analytics";
import countryData from "../data/countries.json";
import type { CountryGeometryProperties } from "../lib/geographic-classification";

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const SOURCE_ID = "quakesignal-country-activity";

setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

type CountryGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

type CountryFeature = {
  type: "Feature";
  id?: string | number;
  properties: CountryGeometryProperties & { totalEvents: number; selected: boolean };
  geometry: CountryGeometry;
};

type CountryFeatureCollection = {
  type: "FeatureCollection";
  features: CountryFeature[];
};

const countryCollection = countryData as unknown as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id?: string | number;
    properties: CountryGeometryProperties;
    geometry: CountryGeometry;
  }>;
};

function createFillExpression(maximum: number) {
  const top = Math.max(1, maximum);
  const steps = top <= 1
    ? [0, 0.25, 0.5, 0.75, 1]
    : [0, top * 0.2, top * 0.45, top * 0.7, top];
  return [
    "interpolate",
    ["linear"],
    ["get", "totalEvents"],
    steps[0], "#171d23",
    steps[1], "#203e3b",
    steps[2], "#285c55",
    steps[3], "#3b887e",
    steps[4], "#68bdb2",
  ] as ExpressionSpecification;
}

function toFeatureCollection(
  groups: readonly GeographicGroup[],
  selectedCountryId: string | null,
): CountryFeatureCollection {
  const counts = new Map<string, number>();
  for (const group of groups) {
    if (group.kind === "country") {
      counts.set(group.countryId, group.totalEvents);
    }
  }

  return {
    type: "FeatureCollection",
    features: countryCollection.features.map((feature) => ({
      type: "Feature",
      id: feature.properties.countryId,
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        totalEvents: counts.get(feature.properties.countryId) ?? 0,
        selected: feature.properties.countryId === selectedCountryId,
      },
    })),
  };
}

function geometryPositions(geometry: CountryGeometry): number[][] {
  const positions: number[][] = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      positions.push(value as number[]);
      return;
    }
    value.forEach(visit);
  };
  visit(geometry.coordinates);
  return positions;
}

function fitCountry(map: MapLibreMap, feature: CountryFeature): void {
  const positions = geometryPositions(feature.geometry);
  if (positions.length === 0) return;
  const bounds = positions.reduce(
    (result, [longitude, latitude]) => ({
      minimumLongitude: Math.min(result.minimumLongitude, longitude),
      minimumLatitude: Math.min(result.minimumLatitude, latitude),
      maximumLongitude: Math.max(result.maximumLongitude, longitude),
      maximumLatitude: Math.max(result.maximumLatitude, latitude),
    }),
    {
      minimumLongitude: Number.POSITIVE_INFINITY,
      minimumLatitude: Number.POSITIVE_INFINITY,
      maximumLongitude: Number.NEGATIVE_INFINITY,
      maximumLatitude: Number.NEGATIVE_INFINITY,
    },
  );
  map.fitBounds(
    [
      [bounds.minimumLongitude, bounds.minimumLatitude],
      [bounds.maximumLongitude, bounds.maximumLatitude],
    ],
    { padding: 52, maxZoom: 4.5, duration: 450 },
  );
}

export function CountryActivityMap({
  groups,
  selectedCountryId,
  onSelectCountry,
  onError,
}: {
  groups: readonly GeographicGroup[];
  selectedCountryId: string | null;
  onSelectCountry: (countryId: string) => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latestData = useRef(toFeatureCollection(groups, selectedCountryId));
  const onSelectCountryRef = useRef(onSelectCountry);
  const onErrorRef = useRef(onError);
  const maximumRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const data = useMemo(
    () => toFeatureCollection(groups, selectedCountryId),
    [groups, selectedCountryId],
  );
  const maximum = useMemo(
    () => Math.max(0, ...groups.flatMap((group) => group.kind === "country" ? [group.totalEvents] : [])),
    [groups],
  );

  useEffect(() => {
    onSelectCountryRef.current = onSelectCountry;
    onErrorRef.current = onError;
    maximumRef.current = maximum;
  }, [maximum, onError, onSelectCountry]);

  useEffect(() => {
    if (!containerRef.current) return;

    let loaded = false;
    let errorReported = false;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: [0, 16],
      zoom: 1.05,
      minZoom: 1,
      maxZoom: 7,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const failMap = () => {
      if (errorReported) return;
      errorReported = true;
      onErrorRef.current();
    };
    const loadTimeout = window.setTimeout(() => {
      if (!loaded) failMap();
    }, 15_000);

    map.on("error", () => {
      if (!loaded) failMap();
    });

    map.once("load", () => {
      loaded = true;
      window.clearTimeout(loadTimeout);
      map.addSource(SOURCE_ID, { type: "geojson", data: latestData.current });
      map.addLayer({
        id: "analytics-country-fill",
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": createFillExpression(maximumRef.current),
          "fill-opacity": 0.92,
        },
      });
      map.addLayer({
        id: "analytics-country-outline",
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": [
            "case",
            ["boolean", ["get", "selected"], false],
            "#f1f3f5",
            "#39434b",
          ],
          "line-width": [
            "case",
            ["boolean", ["get", "selected"], false],
            1.8,
            0.55,
          ],
          "line-opacity": 0.92,
        },
      });
      map.on("click", "analytics-country-fill", (event) => {
        const countryId = event.features?.[0]?.properties?.countryId;
        if (typeof countryId === "string") onSelectCountryRef.current(countryId);
      });
      map.on("mouseenter", "analytics-country-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "analytics-country-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      setIsReady(true);
    });

    return () => {
      window.clearTimeout(loadTimeout);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    latestData.current = data;
    const source = mapRef.current?.getSource(SOURCE_ID);
    if (source?.type === "geojson") (source as GeoJSONSource).setData(data as never);
  }, [data]);

  useEffect(() => {
    const map = mapRef.current;
    if (isReady && map?.getLayer("analytics-country-fill")) {
      map.setPaintProperty("analytics-country-fill", "fill-color", createFillExpression(maximum));
    }
  }, [isReady, maximum]);

  useEffect(() => {
    if (!selectedCountryId || !mapRef.current) return;
    const feature = data.features.find(
      ({ properties }) => properties.countryId === selectedCountryId,
    );
    if (feature) fitCountry(mapRef.current, feature);
  }, [data, selectedCountryId]);

  return (
    <div className="analytics-country-map-wrap">
      <div
        ref={containerRef}
        className="analytics-country-map"
        role="region"
        aria-label="Mapa coroplético de conteos sísmicos observados por país. El ranking permite seleccionar los mismos países."
      />
      {!isReady ? (
        <div className="analytics-country-map-loading" role="status">Cargando mapa</div>
      ) : null}
    </div>
  );
}
