import countryGeometries from "../data/continents.json";
import {
  locatePointInRing,
  prepareRing,
  type PreparedRing,
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
type PreparedPolygon = { outer: PreparedRing; holes: PreparedRing[] };
type PreparedContinentFeature = { continent: Continent; polygons: PreparedPolygon[] };

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

function preparePolygon(polygon: Polygon): PreparedPolygon | null {
  const [outerSource, ...holeSources] = polygon;
  const outer = outerSource ? prepareRing(outerSource) : null;
  if (!outer) return null;

  return {
    outer,
    holes: holeSources.flatMap((ring) => {
      const prepared = prepareRing(ring);
      return prepared ? [prepared] : [];
    }),
  };
}

const preparedFeatures: PreparedContinentFeature[] = features.flatMap((feature) => {
  const continent = feature.properties.continent;
  if (!validContinents.has(continent)) return [];

  const sourcePolygons = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as Polygon]
    : feature.geometry.coordinates as Polygon[];
  const polygons = sourcePolygons
    .map(preparePolygon)
    .filter((polygon): polygon is PreparedPolygon => polygon !== null);
  return polygons.length > 0 ? [{ continent: continent as Continent, polygons }] : [];
});

function pointInPreparedPolygon(
  longitude: number,
  latitude: number,
  polygon: PreparedPolygon,
): boolean {
  if (locatePointInRing(longitude, latitude, polygon.outer) === "outside") {
    return false;
  }

  return !polygon.holes.some((hole) =>
    locatePointInRing(longitude, latitude, hole) !== "outside",
  );
}

export function classifyContinent(
  coordinates: { longitude: number; latitude: number } | null,
): Continent | null {
  if (!coordinates) {
    return null;
  }

  for (const feature of preparedFeatures) {
    if (feature.polygons.some((polygon) =>
      pointInPreparedPolygon(coordinates.longitude, coordinates.latitude, polygon),
    )) {
      return feature.continent;
    }
  }

  return null;
}
