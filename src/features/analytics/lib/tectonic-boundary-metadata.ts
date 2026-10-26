import boundaryMetadata from "../data/tectonic-boundaries-metadata.json";

export const TECTONIC_BOUNDARY_METADATA = boundaryMetadata as {
  source: string;
  query: string;
  capturedAt: string;
  featureCount: number;
  missingNames: number;
  geometryCounts: Record<string, number>;
  sha256: string;
};
