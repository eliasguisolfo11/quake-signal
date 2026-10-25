import countryData from "../data/countries.json";
import landData from "../data/land.json";
import {
  locatePointInRing as locatePointOnRing,
  prepareRing as prepareGeometryRing,
  type GeoPosition,
  type PointRelation,
  type PreparedRing,
} from "../../../lib/geo/point-in-polygon";
import type { Coordinates } from "@/features/events/lib/types";

type Ring = readonly GeoPosition[];
type Polygon = readonly Ring[];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: readonly Polygon[] };

export type CountryGeometryProperties = {
  countryId: string;
  name: string;
  continent: string;
};

export type GeoFeature<Properties> = {
  type: "Feature";
  properties: Properties;
  geometry: Geometry;
};

export type GeoFeatureCollection<Properties> = {
  type: "FeatureCollection";
  features: readonly GeoFeature<Properties>[];
};

export type EpicenterAssignment =
  | {
      kind: "country";
      countryId: string;
      name: string;
      continent: string;
    }
  | { kind: "oceanic" }
  | { kind: "land-unassigned" }
  | { kind: "border-overlap" }
  | { kind: "no-coordinates" };

type Relation = PointRelation;

type PreparedPolygon = {
  outer: PreparedRing;
  holes: PreparedRing[];
};

type PreparedFeature<Properties> = {
  properties: Properties;
  polygons: PreparedPolygon[];
};

type PreparedCollection<Properties> = {
  features: PreparedFeature<Properties>[];
};

type SpatialIndex = number[][];

export type EpicenterClassifier = (
  coordinates: Coordinates | null,
) => EpicenterAssignment;

export const GEOGRAPHIC_DATA_VERSION = {
  countries: "Natural Earth Admin 0 – Countries 1:110m v5.1.1",
  land: "Natural Earth Land 1:110m v4.0.0",
} as const;

const countries = countryData as unknown as GeoFeatureCollection<CountryGeometryProperties>;
const land = landData as unknown as GeoFeatureCollection<Record<string, never>>;
const SPATIAL_CELL_DEGREES = 5;
const LONGITUDE_CELL_COUNT = 360 / SPATIAL_CELL_DEGREES;
const LATITUDE_CELL_COUNT = 180 / SPATIAL_CELL_DEGREES;
const SPATIAL_CELL_COUNT = LONGITUDE_CELL_COUNT * LATITUDE_CELL_COUNT;
const BOUNDARY_EPSILON = 1e-8;

function preparePolygon(polygon: Polygon): PreparedPolygon | null {
  const [outerSource, ...holeSources] = polygon;
  const outer = outerSource ? prepareGeometryRing(outerSource) : null;
  if (!outer) {
    return null;
  }

  return {
    outer,
    holes: holeSources.flatMap((ring) => {
      const prepared = prepareGeometryRing(ring);
      return prepared ? [prepared] : [];
    }),
  };
}

function polygonCoordinates(geometry: Geometry): readonly Polygon[] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function prepareCollection<Properties>(
  collection: GeoFeatureCollection<Properties>,
): PreparedCollection<Properties> {
  return {
    features: collection.features.flatMap((feature) => {
      if (!feature?.geometry || !Array.isArray(feature.geometry.coordinates)) {
        return [];
      }

      const polygons = polygonCoordinates(feature.geometry)
        .map(preparePolygon)
        .filter((polygon): polygon is PreparedPolygon => polygon !== null);
      return polygons.length > 0 ? [{ properties: feature.properties, polygons }] : [];
    }),
  };
}

function locatePointInPolygon(
  longitude: number,
  latitude: number,
  polygon: PreparedPolygon,
): Relation {
  const outerRelation = locatePointOnRing(longitude, latitude, polygon.outer);
  if (outerRelation !== "inside") {
    return outerRelation;
  }

  for (const hole of polygon.holes) {
    const holeRelation = locatePointOnRing(longitude, latitude, hole);
    if (holeRelation === "boundary") {
      return "boundary";
    }
    if (holeRelation === "inside") {
      return "outside";
    }
  }

  return "inside";
}

function locatePointInFeature<Properties>(
  longitude: number,
  latitude: number,
  feature: PreparedFeature<Properties>,
): Relation {
  let touchesBoundary = false;
  for (const polygon of feature.polygons) {
    const relation = locatePointInPolygon(longitude, latitude, polygon);
    if (relation === "inside") {
      return "inside";
    }
    if (relation === "boundary") {
      touchesBoundary = true;
    }
  }

  return touchesBoundary ? "boundary" : "outside";
}

function longitudeIntervals(bounds: PreparedRing["bounds"]): Array<[number, number]> {
  const intervals: Array<[number, number]> = [];
  for (const shift of [-360, 0, 360]) {
    const minimum = Math.max(-180, bounds.minLongitude + shift);
    const maximum = Math.min(180, bounds.maxLongitude + shift);
    if (minimum <= maximum) {
      intervals.push([minimum, maximum]);
    }
  }

  return intervals;
}

function longitudeCell(longitude: number): number {
  return Math.max(
    0,
    Math.min(
      LONGITUDE_CELL_COUNT - 1,
      Math.floor((longitude + 180) / SPATIAL_CELL_DEGREES),
    ),
  );
}

function latitudeCell(latitude: number): number {
  return Math.max(
    0,
    Math.min(
      LATITUDE_CELL_COUNT - 1,
      Math.floor((latitude + 90) / SPATIAL_CELL_DEGREES),
    ),
  );
}

function buildSpatialIndex<Properties>(
  features: PreparedFeature<Properties>[],
): SpatialIndex {
  const index = Array.from({ length: SPATIAL_CELL_COUNT }, () => [] as number[]);

  features.forEach((feature, featureIndex) => {
    const cells = new Set<number>();
    for (const polygon of feature.polygons) {
      const bounds = polygon.outer.bounds;
      const minLatitude = Math.max(-90, bounds.minLatitude - BOUNDARY_EPSILON);
      const maxLatitude = Math.min(90, bounds.maxLatitude + BOUNDARY_EPSILON);
      const minLatitudeCell = latitudeCell(minLatitude);
      const maxLatitudeCell = latitudeCell(maxLatitude);

      for (const [minLongitude, maxLongitude] of longitudeIntervals(bounds)) {
        const minLongitudeCell = longitudeCell(minLongitude - BOUNDARY_EPSILON);
        const maxLongitudeCell = longitudeCell(maxLongitude + BOUNDARY_EPSILON);
        for (let latitudeBin = minLatitudeCell; latitudeBin <= maxLatitudeCell; latitudeBin += 1) {
          for (let longitudeBin = minLongitudeCell; longitudeBin <= maxLongitudeCell; longitudeBin += 1) {
            cells.add(latitudeBin * LONGITUDE_CELL_COUNT + longitudeBin);
          }
        }
      }
    }

    for (const cell of cells) {
      index[cell].push(featureIndex);
    }
  });

  return index;
}

function candidateFeatures<Properties>(
  longitude: number,
  latitude: number,
  collection: PreparedCollection<Properties>,
  index: SpatialIndex,
): PreparedFeature<Properties>[] {
  const cell = latitudeCell(latitude) * LONGITUDE_CELL_COUNT + longitudeCell(longitude);
  return index[cell].map((featureIndex) => collection.features[featureIndex]);
}

function locatePointInCollection<Properties>(
  longitude: number,
  latitude: number,
  candidates: PreparedFeature<Properties>[],
): Relation {
  for (const feature of candidates) {
    if (locatePointInFeature(longitude, latitude, feature) !== "outside") {
      return "inside";
    }
  }

  return "outside";
}

export function createEpicenterClassifier(
  countryCollection: GeoFeatureCollection<CountryGeometryProperties>,
  landCollection: GeoFeatureCollection<Record<string, never>>,
): EpicenterClassifier {
  const preparedCountries = prepareCollection(countryCollection);
  const preparedLand = prepareCollection(landCollection);
  const countryIndex = buildSpatialIndex(preparedCountries.features);
  const landIndex = buildSpatialIndex(preparedLand.features);

  return (coordinates) => {
    if (
      !coordinates ||
      !Number.isFinite(coordinates.longitude) ||
      !Number.isFinite(coordinates.latitude) ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180 ||
      coordinates.latitude < -90 ||
      coordinates.latitude > 90
    ) {
      return { kind: "no-coordinates" };
    }

    const { longitude, latitude } = coordinates;
    const landCandidates = candidateFeatures(longitude, latitude, preparedLand, landIndex);
    if (locatePointInCollection(longitude, latitude, landCandidates) === "outside") {
      return { kind: "oceanic" };
    }

    let interior: PreparedFeature<CountryGeometryProperties> | null = null;
    const countryCandidates = candidateFeatures(
      longitude,
      latitude,
      preparedCountries,
      countryIndex,
    );
    for (const feature of countryCandidates) {
      const relation = locatePointInFeature(longitude, latitude, feature);
      if (relation === "boundary") {
        return { kind: "border-overlap" };
      }
      if (relation === "inside") {
        if (interior) {
          return { kind: "border-overlap" };
        }
        interior = feature;
      }
    }

    if (interior) {
      const properties = interior.properties;
      return {
        kind: "country",
        countryId: properties.countryId,
        name: properties.name,
        continent: properties.continent,
      };
    }

    return { kind: "land-unassigned" };
  };
}

const classifyFromNaturalEarth = createEpicenterClassifier(countries, land);

export function classifyEpicenter(coordinates: Coordinates | null): EpicenterAssignment {
  return classifyFromNaturalEarth(coordinates);
}

export function listAnalyticsCountries(): CountryGeometryProperties[] {
  return countries.features
    .map(({ properties }) => ({ ...properties }))
    .sort((first, second) => first.name.localeCompare(second.name));
}
