import countryGeometries from "../data/continents.json";
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

function unwrapRing(ring: Ring, referenceLongitude: number): Position[] {
  if (ring.length === 0) {
    return [];
  }

  const unwrapped: Position[] = [];
  let previousLongitude = ring[0][0];
  unwrapped.push([previousLongitude, ring[0][1]]);

  for (const [rawLongitude, latitude] of ring.slice(1)) {
    let longitude = rawLongitude;
    while (longitude - previousLongitude > 180) longitude -= 360;
    while (longitude - previousLongitude < -180) longitude += 360;
    unwrapped.push([longitude, latitude]);
    previousLongitude = longitude;
  }

  const longitudes = unwrapped.map(([longitude]) => longitude);
  const center = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const shift = 360 * Math.round((referenceLongitude - center) / 360);
  return unwrapped.map(([longitude, latitude]) => [longitude + shift, latitude]);
}

function liesOnSegment(
  longitude: number,
  latitude: number,
  first: Position,
  second: Position,
): boolean {
  const cross =
    (latitude - first[1]) * (second[0] - first[0]) -
    (longitude - first[0]) * (second[1] - first[1]);

  if (Math.abs(cross) > 1e-8) {
    return false;
  }

  return (
    longitude >= Math.min(first[0], second[0]) - 1e-8 &&
    longitude <= Math.max(first[0], second[0]) + 1e-8 &&
    latitude >= Math.min(first[1], second[1]) - 1e-8 &&
    latitude <= Math.max(first[1], second[1]) + 1e-8
  );
}

function pointInRing(longitude: number, latitude: number, ring: Ring): boolean {
  const points = unwrapRing(ring, longitude);
  let inside = false;

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const first = points[previous];
    const second = points[index];

    if (liesOnSegment(longitude, latitude, first, second)) {
      return true;
    }

    const crossesLatitude = (first[1] > latitude) !== (second[1] > latitude);
    if (
      crossesLatitude &&
      longitude <
        ((second[0] - first[0]) * (latitude - first[1])) /
          (second[1] - first[1]) +
          first[0]
    ) {
      inside = !inside;
    }
  }

  return inside;
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
