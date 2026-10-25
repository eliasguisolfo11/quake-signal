import boundaryData from "../data/tectonic-plate-boundaries.json";
import boundaryMetadata from "../data/tectonic-boundaries-metadata.json";
import type { Coordinates } from "@/features/events/lib/types";

type Position = readonly [longitude: number, latitude: number];
type LineGeometry =
  | { type: "LineString"; coordinates: readonly Position[] }
  | { type: "MultiLineString"; coordinates: readonly (readonly Position[])[] };

export type TectonicBoundaryType =
  | "Convergent Boundary"
  | "Divergent Boundary"
  | "Transform Boundary"
  | "Other";

export type TectonicBoundaryProperties = {
  sourceObjectId: number;
  boundaryName: string | null;
  boundaryType: TectonicBoundaryType;
};

export type TectonicFeature = {
  type: "Feature";
  id: number;
  properties: TectonicBoundaryProperties;
  geometry: LineGeometry;
};

export type TectonicFeatureCollection = {
  type: "FeatureCollection";
  features: readonly TectonicFeature[];
};

export type NearestTectonicBoundary = TectonicBoundaryProperties & {
  distanceKm: number;
};

type Segment = {
  start: Position;
  end: Position;
  properties: TectonicBoundaryProperties;
};

const EARTH_RADIUS_KM = 6_371.0088;
const boundaryCollection = boundaryData as unknown as TectonicFeatureCollection;
export const TECTONIC_BOUNDARY_METADATA = boundaryMetadata as {
  source: string;
  query: string;
  capturedAt: string;
  featureCount: number;
  missingNames: number;
  geometryCounts: Record<string, number>;
  sha256: string;
};

function isValidPosition(position: unknown): position is Position {
  return (
    Array.isArray(position) &&
    position.length >= 2 &&
    typeof position[0] === "number" &&
    Number.isFinite(position[0]) &&
    position[0] >= -180 &&
    position[0] <= 180 &&
    typeof position[1] === "number" &&
    Number.isFinite(position[1]) &&
    position[1] >= -90 &&
    position[1] <= 90
  );
}

function lineParts(geometry: LineGeometry): readonly (readonly Position[])[] {
  return geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
}

function prepareSegments(collection: TectonicFeatureCollection): Segment[] {
  return collection.features.flatMap((feature) => {
    const lines = lineParts(feature.geometry);
    return lines.flatMap((line) => {
      const segments: Segment[] = [];
      for (let index = 1; index < line.length; index += 1) {
        const start = line[index - 1];
        const end = line[index];
        if (isValidPosition(start) && isValidPosition(end)) {
          segments.push({
            start,
            end,
            properties: feature.properties,
          });
        }
      }
      return segments;
    });
  });
}

function radians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function angularDistance(first: Position, second: Position): number {
  const firstLatitude = radians(first[1]);
  const secondLatitude = radians(second[1]);
  const latitudeDelta = secondLatitude - firstLatitude;
  const longitudeDelta = radians(second[0] - first[0]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
}

function initialBearing(start: Position, destination: Position): number {
  const startLatitude = radians(start[1]);
  const destinationLatitude = radians(destination[1]);
  const longitudeDelta = radians(destination[0] - start[0]);
  return Math.atan2(
    Math.sin(longitudeDelta) * Math.cos(destinationLatitude),
    Math.cos(startLatitude) * Math.sin(destinationLatitude) -
      Math.sin(startLatitude) * Math.cos(destinationLatitude) *
      Math.cos(longitudeDelta),
  );
}

function clampUnitInterval(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function distanceToSegmentKm(point: Position, start: Position, end: Position): number {
  const segmentLength = angularDistance(start, end);
  const pointToStart = angularDistance(start, point);
  if (segmentLength < Number.EPSILON) {
    return pointToStart * EARTH_RADIUS_KM;
  }

  const bearingDelta = initialBearing(start, point) - initialBearing(start, end);
  const alongTrack = Math.atan2(
    Math.sin(pointToStart) * Math.cos(bearingDelta),
    Math.cos(pointToStart),
  );
  if (alongTrack <= 0) {
    return pointToStart * EARTH_RADIUS_KM;
  }
  if (alongTrack >= segmentLength) {
    return angularDistance(point, end) * EARTH_RADIUS_KM;
  }

  const crossTrack = Math.asin(
    clampUnitInterval(Math.sin(pointToStart) * Math.sin(bearingDelta)),
  );
  return Math.abs(crossTrack) * EARTH_RADIUS_KM;
}

export function computeNearestTectonicBoundary(
  coordinates: Coordinates | null,
  collection: TectonicFeatureCollection,
): NearestTectonicBoundary | null {
  return nearestFromSegments(coordinates, prepareSegments(collection));
}

function isValidCoordinates(coordinates: Coordinates | null): coordinates is Coordinates {
  if (
    !coordinates ||
    !Number.isFinite(coordinates.longitude) ||
    !Number.isFinite(coordinates.latitude) ||
    coordinates.longitude < -180 ||
    coordinates.longitude > 180 ||
    coordinates.latitude < -90 ||
    coordinates.latitude > 90
  ) {
    return false;
  }
  return true;
}

function nearestFromSegments(
  coordinates: Coordinates | null,
  segments: readonly Segment[],
): NearestTectonicBoundary | null {
  if (!isValidCoordinates(coordinates)) return null;
  let closest: { segment: Segment; distanceKm: number } | null = null;
  const point: Position = [coordinates.longitude, coordinates.latitude];
  for (const segment of segments) {
    const distanceKm = distanceToSegmentKm(point, segment.start, segment.end);
    if (!closest || distanceKm < closest.distanceKm) {
      closest = { segment, distanceKm };
    }
  }

  if (!closest) {
    return null;
  }

  return {
    ...closest.segment.properties,
    distanceKm: Math.round(closest.distanceKm * 10) / 10,
  };
}

const preparedSegments = prepareSegments(boundaryCollection);

export function findNearestTectonicBoundary(
  coordinates: Coordinates | null,
): NearestTectonicBoundary | null {
  return nearestFromSegments(coordinates, preparedSegments);
}
