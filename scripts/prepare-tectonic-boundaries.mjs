import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(repositoryRoot, "src/features/analytics/data");
const layerUrl = "https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer/1";
const pageSize = 1_000;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function requestJson(url, parameters = {}) {
  const requestUrl = new URL(url);
  for (const [key, value] of Object.entries(parameters)) {
    requestUrl.searchParams.set(key, String(value));
  }

  const response = await fetch(requestUrl, {
    headers: { Accept: "application/json, application/geo+json" },
  });
  if (!response.ok) {
    throw new Error("USGS respondió HTTP " + response.status + " para " + requestUrl.pathname + ".");
  }

  const body = await response.json();
  if (body?.error) {
    throw new Error("USGS devolvió un error de consulta: " + (body.error.message ?? "sin detalle") + ".");
  }
  return body;
}

function assertBoundaryFeature(feature) {
  const objectId = feature?.properties?.OBJECTID;
  const boundaryName = feature?.properties?.NAME;
  const boundaryType = feature?.properties?.LABEL;
  const geometry = feature?.geometry;
  if (
    !Number.isSafeInteger(objectId) ||
    (boundaryName !== null && typeof boundaryName !== "string") ||
    boundaryName === "" ||
    typeof boundaryType !== "string" ||
    !["LineString", "MultiLineString"].includes(geometry?.type) ||
    !Array.isArray(geometry.coordinates)
  ) {
    throw new Error("USGS devolvió una geometría tectónica con campos inválidos.");
  }

  return {
    type: "Feature",
    id: objectId,
    properties: {
      sourceObjectId: objectId,
      boundaryName: typeof boundaryName === "string" ? boundaryName : null,
      boundaryType,
    },
    geometry,
  };
}

const metadata = await requestJson(layerUrl, { f: "json" });
if (
  metadata?.id !== 1 ||
  metadata?.name !== "Plates" ||
  metadata?.geometryType !== "esriGeometryPolyline" ||
  !Number.isSafeInteger(metadata?.maxRecordCount) ||
  metadata.maxRecordCount < 1
) {
  throw new Error("La capa USGS ya no coincide con el contrato documentado para Plates (ID 1).");
}

const count = await requestJson(layerUrl + "/query", {
  where: "1=1",
  returnCountOnly: true,
  f: "json",
});
const idResult = await requestJson(layerUrl + "/query", {
  where: "1=1",
  returnIdsOnly: true,
  f: "json",
});
const ids = idResult.objectIds;
if (!Number.isSafeInteger(count.count) || !Array.isArray(ids) || ids.length !== count.count) {
  throw new Error("La cantidad esperada y los IDs de la capa USGS no coinciden.");
}

const recordsPerPage = Math.min(pageSize, metadata.maxRecordCount);
const features = [];
for (let offset = 0; offset < count.count; offset += recordsPerPage) {
  const expectedPageCount = Math.min(recordsPerPage, count.count - offset);
  const page = await requestJson(layerUrl + "/query", {
    where: "1=1",
    outFields: "OBJECTID,NAME,LABEL",
    outSR: 4326,
    returnGeometry: true,
    orderByFields: "OBJECTID ASC",
    resultOffset: offset,
    resultRecordCount: recordsPerPage,
    f: "geojson",
  });
  if (page?.type !== "FeatureCollection" || !Array.isArray(page.features)) {
    throw new Error("La página de límites tectónicos " + (offset + 1) + " no es un FeatureCollection.");
  }
  if (page.features.length !== expectedPageCount) {
    throw new Error("La página de límites tectónicos " + (offset + 1) + " está incompleta.");
  }
  features.push(...page.features.map(assertBoundaryFeature));
}

features.sort((first, second) => first.id - second.id);
const receivedIds = new Set(features.map(({ id }) => id));
if (
  features.length !== count.count ||
  receivedIds.size !== count.count ||
  ids.some((id) => !receivedIds.has(id))
) {
  throw new Error("El snapshot final no conserva todos los IDs USGS únicos.");
}

const collection = { type: "FeatureCollection", features };
const output = Buffer.from(JSON.stringify(collection) + "\n");
const outputPath = resolve(outputDirectory, "tectonic-plate-boundaries.json");
await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, output);

const capturedAt = new Date().toISOString();
const geometryCounts = features.reduce((counts, feature) => {
  counts[feature.geometry.type] = (counts[feature.geometry.type] ?? 0) + 1;
  return counts;
}, {});
const types = [...new Set(features.map(({ properties }) => properties.boundaryType))].sort();
const missingNames = features.filter(({ properties }) => properties.boundaryName === null).length;
const queryUrl = new URL(layerUrl + "/query");
for (const [key, value] of Object.entries({
  where: "1=1",
  outFields: "OBJECTID,NAME,LABEL",
  outSR: 4326,
  returnGeometry: true,
  f: "geojson",
})) {
  queryUrl.searchParams.set(key, String(value));
}
const snapshotMetadata = {
  source: layerUrl,
  query: queryUrl.toString(),
  capturedAt,
  featureCount: features.length,
  missingNames,
  geometryCounts,
  sha256: sha256(output),
};
const geometrySummary = Object.entries(geometryCounts)
  .map(([type, total]) => type + " " + total)
  .join(", ");
const readme = [
  "# Snapshot de límites de placas tectónicas",
  "",
  "- Fuente: [USGS Plates (ID 1)](" + layerUrl + ")",
  "- Consulta de geometría: [ArcGIS REST query](" + queryUrl + ")",
  "- Recuperado: " + capturedAt,
  "- Registros esperados: " + count.count + "; IDs solicitados y geometrías recibidas verificados",
  "- Propiedades conservadas: sourceObjectId, boundaryName (campo USGS NAME) y boundaryType (campo USGS LABEL)",
  "- Elementos sin NAME en la fuente: " + missingNames + "; se conserva la geometría y el tipo con nombre nulo",
  "- Geometrías: " + geometrySummary,
  "- Categorías: " + types.join(", "),
  "- SHA-256 del snapshot reducido: " + sha256(output),
  "",
  "El script scripts/prepare-tectonic-boundaries.mjs reproduce el snapshot: valida el tipo y nombre de la capa, compara el conteo con la lista completa de IDs, recupera los IDs en páginas que respetan el límite del servicio y comprueba que no falten ni se dupliquen elementos. La fecha y el hash identifican esta instantánea; no son una fecha de origen geológico.",
  "",
  "La línea más cercana solo describe proximidad geométrica aproximada entre las coordenadas disponibles y la capa. No establece la causa del sismo ni predice actividad futura.",
  "",
].join("\n");
await writeFile(resolve(outputDirectory, "tectonic-boundaries.md"), readme);
await writeFile(
  resolve(outputDirectory, "tectonic-boundaries-metadata.json"),
  JSON.stringify(snapshotMetadata, null, 2) + "\n",
);

process.stdout.write(
  "tectonic-plate-boundaries.json: " + features.length + " elementos, " +
  output.length + " bytes, SHA-256 " + sha256(output) + "\n",
);
