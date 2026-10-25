import countryGeometries from "../data/continents.json";
import {
  locatePointInRing,
  prepareRing,
} from "../../../lib/geo/point-in-polygon";
import type { Continent } from "./types";

type Position = readonly [number, number];
type Ring = Position[];
type Polygon = Ring[];
type CountryFeature = {
  properties: { continent: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Polygon | Polygon[];
  };
};

const validContinents = new Set<string>([
  "North America",
  "South America",
  "Africa",
  "Asia",
  "Europe",
  "Oceania",
  "Antarctica",
]);

const features = (
  countryGeometries as unknown as { features: CountryFeature[] }
).features;

function pointInRing(longitude: number, latitude: number, ring: Ring): boolean {
  const prepared = prepareRing(ring);
  return prepared !== null && locatePointInRing(longitude, latitude, prepared) !== "outside";
}

function pointInPolygon(longitude: number, latitude: number, polygon: Polygon): boolean {
  const [outerRing, ...holes] = polygon;
  if (!outerRing || !pointInRing(longitude, latitude, outerRing)) {
    return false;
  }

  return !holes.some((hole) => pointInRing(longitude, latitude, hole));
}

function pointInGeometry(longitude: number, latitude: number, feature: CountryFeature): boolean {
  const { type, coordinates } = feature.geometry;
  if (type === "Polygon") {
    return pointInPolygon(longitude, latitude, coordinates as Polygon);
  }

  return (coordinates as Polygon[]).some((polygon) =>
    pointInPolygon(longitude, latitude, polygon),
  );
}

export function classifyContinent(
  coordinates: { longitude: number; latitude: number } | null,
): Continent | null {
  if (!coordinates) {
    return null;
  }

  for (const feature of features) {
    const continent = feature.properties.continent;
    if (
      validContinents.has(continent) &&
      pointInGeometry(coordinates.longitude, coordinates.latitude, feature)
    ) {
      return continent as Continent;
    }
  }

  return null;
}
