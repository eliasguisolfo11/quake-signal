export type GeoPosition = readonly [longitude: number, latitude: number];
export type PointRelation = "inside" | "boundary" | "outside";

export type PreparedRing = {
  positions: GeoPosition[];
  bounds: {
    minLongitude: number;
    minLatitude: number;
    maxLongitude: number;
    maxLatitude: number;
  };
};

const BOUNDARY_EPSILON = 1e-8;

export function prepareRing(ring: readonly GeoPosition[]): PreparedRing | null {
  const first = ring[0];
  if (!first) {
    return null;
  }

  const positions: GeoPosition[] = [[first[0], first[1]]];
  let previousLongitude = first[0];
  for (const [rawLongitude, latitude] of ring.slice(1)) {
    let longitude = rawLongitude;
    while (longitude - previousLongitude > 180) longitude -= 360;
    while (longitude - previousLongitude < -180) longitude += 360;
    positions.push([longitude, latitude]);
    previousLongitude = longitude;
  }

  if (
    positions.length < 4 ||
    positions.some(([longitude, latitude]) =>
      !Number.isFinite(longitude) || !Number.isFinite(latitude),
    )
  ) {
    return null;
  }

  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  return {
    positions,
    bounds: {
      minLongitude: Math.min(...longitudes),
      minLatitude: Math.min(...latitudes),
      maxLongitude: Math.max(...longitudes),
      maxLatitude: Math.max(...latitudes),
    },
  };
}

function liesOnSegment(
  longitude: number,
  latitude: number,
  first: GeoPosition,
  second: GeoPosition,
): boolean {
  const cross =
    (latitude - first[1]) * (second[0] - first[0]) -
    (longitude - first[0]) * (second[1] - first[1]);
  if (Math.abs(cross) > BOUNDARY_EPSILON) {
    return false;
  }

  return (
    longitude >= Math.min(first[0], second[0]) - BOUNDARY_EPSILON &&
    longitude <= Math.max(first[0], second[0]) + BOUNDARY_EPSILON &&
    latitude >= Math.min(first[1], second[1]) - BOUNDARY_EPSILON &&
    latitude <= Math.max(first[1], second[1]) + BOUNDARY_EPSILON
  );
}

export function locatePointInRing(
  longitude: number,
  latitude: number,
  ring: PreparedRing,
): PointRelation {
  const center = (ring.bounds.minLongitude + ring.bounds.maxLongitude) / 2;
  const shift = 360 * Math.round((longitude - center) / 360);
  const minLongitude = ring.bounds.minLongitude + shift;
  const maxLongitude = ring.bounds.maxLongitude + shift;
  if (
    longitude < minLongitude - BOUNDARY_EPSILON ||
    longitude > maxLongitude + BOUNDARY_EPSILON ||
    latitude < ring.bounds.minLatitude - BOUNDARY_EPSILON ||
    latitude > ring.bounds.maxLatitude + BOUNDARY_EPSILON
  ) {
    return "outside";
  }

  let inside = false;
  const { positions } = ring;
  for (
    let index = 0, previous = positions.length - 1;
    index < positions.length;
    previous = index++
  ) {
    const [firstLongitude, firstLatitude] = positions[previous];
    const [secondLongitude, secondLatitude] = positions[index];
    const first: GeoPosition = [firstLongitude + shift, firstLatitude];
    const second: GeoPosition = [secondLongitude + shift, secondLatitude];

    if (liesOnSegment(longitude, latitude, first, second)) {
      return "boundary";
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

  return inside ? "inside" : "outside";
}
