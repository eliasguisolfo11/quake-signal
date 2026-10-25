# Geometrías para análisis sísmico

Datos Natural Earth a escala 1:110m usados para asignar cada epicentro por coordenadas. El campo place de USGS no se utiliza para la clasificación.

| Dataset | Versión | Elementos | Página de origen | Archivo fuente fijado | SHA-256 fuente | SHA-256 archivo reducido |
| --- | ---: | ---: | --- | --- | --- | --- |
| Admin 0 – Countries, 1:110m | 5.1.1 | 177 | [Natural Earth](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/) | [GeoJSON fijado](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_110m_admin_0_countries.geojson) | 6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f | 135ffeb7a175908d3a0634d36a14e339dd62b88351f83a1d0873ed9b321679af |
| Land, 1:110m | 4.0.0 | 127 | [Natural Earth](https://www.naturalearthdata.com/downloads/110m-physical-vectors/) | [GeoJSON fijado](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v4.0.0/geojson/ne_110m_land.geojson) | 58c4f5d673c1ac2c7ddc04817f15e30a124af021bf7a74488c459b91f0f93d6e | 53b2a598a5131da936a2f92ec3b0f8e603b190b4a428368a1734c9217e3ef567 |

Fecha de incorporación: 2026-10-25.

Los archivos del repositorio conservan únicamente geometría y las propiedades necesarias para la clasificación y la interfaz. La escala 1:110m generaliza límites y omite algunos elementos pequeños; los epicentros que queden en tierra sin una geometría de país permanecen en Tierra sin país asignado. El script scripts/prepare-analytics-geodata.mjs reproduce esta reducción desde las URL versionadas y vuelve a calcular los hashes. Natural Earth publica sus datos vectoriales en dominio público; las fronteras reflejan el dataset y su escala, y no resuelven soberanía.
