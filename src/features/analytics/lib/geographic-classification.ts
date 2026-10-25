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

export type EpicenterClassifier = (
  coordinates: Coordinates | null,
) => EpicenterAssignment;

export const GEOGRAPHIC_DATA_VERSION = {
  countries: "Natural Earth Admin 0 – Countries 1:110m v5.1.1",
  land: "Natural Earth Land 1:110m v4.0.0",
} as const;

const countries = countryData as unknown as GeoFeatureCollection<CountryGeometryProperties>;
const land = landData as unknown as GeoFeatureCollection<Record<string, never>>;

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

function locatePointInCollection<Properties>(
  longitude: number,
  latitude: number,
  collection: PreparedCollection<Properties>,
): Relation {
  for (const feature of collection.features) {
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
    if (locatePointInCollection(longitude, latitude, preparedLand) === "outside") {
      return { kind: "oceanic" };
    }

    let interior: PreparedFeature<CountryGeometryProperties> | null = null;
    for (const feature of preparedCountries.features) {
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
