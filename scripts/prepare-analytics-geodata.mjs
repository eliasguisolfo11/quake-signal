import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(
  repositoryRoot,
  "src/features/analytics/data",
);

const sources = [
  {
    key: "countries",
    output: "countries.json",
    dataset: "Admin 0 – Countries, 1:110m",
    version: "5.1.1",
    page: "https://www.naturalearthdata.com/downloads/110m-cultural-vectors/",
    url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_110m_admin_0_countries.geojson",
  },
  {
    key: "land",
    output: "land.json",
    dataset: "Land, 1:110m",
    version: "4.0.0",
    page: "https://www.naturalearthdata.com/downloads/110m-physical-vectors/",
    url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v4.0.0/geojson/ne_110m_land.geojson",
  },
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isValidCountryCode(value) {
  return typeof value === "string" && /^[A-Z0-9]{3}$/.test(value);
}

function reduceCountries(collection) {
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error("El GeoJSON de países no es un FeatureCollection válido.");
  }

  const features = collection.features.flatMap((feature) => {
    const properties = feature?.properties;
    const geometry = feature?.geometry;
    if (
      !properties ||
      !geometry ||
      !["Polygon", "MultiPolygon"].includes(geometry.type) ||
      !Array.isArray(geometry.coordinates)
    ) {
      return [];
    }

    const codes = [
      properties.ADM0_A3,
      properties.ISO_A3_EH,
      properties.ISO_A3,
      properties.ADM0_ISO,
    ];
    const countryId = codes.find(isValidCountryCode) ??
      (Number.isFinite(properties.NE_ID) ? `NE${properties.NE_ID}` : null);
    const name = properties.NAME_ES ?? properties.NAME_EN ?? properties.ADMIN ?? properties.NAME;
    const continent = properties.CONTINENT;
    if (
      !countryId ||
      typeof name !== "string" ||
      typeof continent !== "string"
    ) {
      return [];
    }

    return [{
      type: "Feature",
      properties: { countryId, name, continent },
      geometry,
    }];
  });

  const ids = features.map(({ properties }) => properties.countryId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Natural Earth produjo códigos de país duplicados.");
  }
  if (features.length < 150) {
    throw new Error(`Cantidad de geometrías de países inesperada: ${features.length}.`);
  }

  return { type: "FeatureCollection", features };
}

function reduceLand(collection) {
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error("El GeoJSON de tierra no es un FeatureCollection válido.");
  }

  const features = collection.features.flatMap((feature) => {
    const geometry = feature?.geometry;
    if (
      !geometry ||
      !["Polygon", "MultiPolygon"].includes(geometry.type) ||
      !Array.isArray(geometry.coordinates)
    ) {
      return [];
    }
    return [{ type: "Feature", properties: {}, geometry }];
  });

  if (features.length === 0) {
    throw new Error("Natural Earth no devolvió geometrías de tierra.");
  }

  return { type: "FeatureCollection", features };
}

await mkdir(outputDirectory, { recursive: true });
const processed = [];

for (const source of sources) {
  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`Falló la descarga ${source.key}: HTTP ${response.status}.`);
  }

  const rawBytes = Buffer.from(await response.arrayBuffer());
  const original = JSON.parse(rawBytes.toString("utf8"));
  const reduced = source.key === "countries"
    ? reduceCountries(original)
    : reduceLand(original);
  const outputBytes = Buffer.from(JSON.stringify(reduced));
  const outputPath = resolve(outputDirectory, source.output);
  await writeFile(outputPath, outputBytes);
  processed.push({
    ...source,
    sourceSha256: sha256(rawBytes),
    outputSha256: sha256(outputBytes),
    outputBytes: outputBytes.length,
    features: reduced.features.length,
  });
}

const incorporated = new Date().toISOString().slice(0, 10);
const rows = processed.map((source) =>
  `| ${source.dataset} | ${source.version} | ${source.features} | [Natural Earth](${source.page}) | [GeoJSON fijado](${source.url}) | ${source.sourceSha256} | ${source.outputSha256} |`,
).join("\n");
const readme = `# Geometrías para análisis sísmico

Datos Natural Earth a escala 1:110m usados para asignar cada epicentro por coordenadas. El campo place de USGS no se utiliza para la clasificación.

| Dataset | Versión | Elementos | Página de origen | Archivo fuente fijado | SHA-256 fuente | SHA-256 archivo reducido |
| --- | ---: | ---: | --- | --- | --- | --- |
${rows}

Fecha de incorporación: ${incorporated}.

Los archivos del repositorio conservan únicamente geometría y las propiedades necesarias para la clasificación y la interfaz. La escala 1:110m generaliza límites y omite algunos elementos pequeños; los epicentros que queden en tierra sin una geometría de país permanecen en Tierra sin país asignado. El script scripts/prepare-analytics-geodata.mjs reproduce esta reducción desde las URL versionadas y vuelve a calcular los hashes. Natural Earth publica sus datos vectoriales en dominio público; las fronteras reflejan el dataset y su escala, y no resuelven soberanía.
`;
await writeFile(resolve(outputDirectory, "README.md"), readme);

for (const source of processed) {
  process.stdout.write(
    `${source.output}: ${source.features} elementos, ${source.outputBytes} bytes, SHA-256 ${source.outputSha256}\n`,
  );
}
