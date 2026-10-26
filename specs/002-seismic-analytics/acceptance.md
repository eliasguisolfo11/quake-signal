# Aceptación — análisis sísmico (T-13)

**Rama:** feature/T-13-analytics-acceptance
**Fecha:** 2026-10-26
**Estado:** Completa; AC-01 a AC-12 aprobados.

## Método y entorno

Se verificó el repositorio QuakeSignal mediante el build de producción de Next.js (127.0.0.1:3000) y el navegador integrado Playwright. La interfaz se recorrió a 1440 × 900 y 375 × 812 px, con datos de USGS y selección por teclado. El resumen, la cobertura, la procedencia, los filtros y las sumas se contrastaron contra la respuesta HTTP de la API local.

Capturas del build de producción:

- Escritorio: [evidence/analytics-desktop.png](evidence/analytics-desktop.png).
- Móvil, 375 px: [evidence/analytics-mobile-375.png](evidence/analytics-mobile-375.png).

Los conteos de USGS son observaciones del momento de la consulta; pueden cambiar entre ejecuciones. La frecuencia histórica describe eventos registrados y no predice sismos futuros.

## Resultado por criterio

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| AC-01 | Aprobado | En producción, la navegación permitió pasar por Historial y abrir Análisis. La página mostró el título “Análisis sísmico”. |
| AC-02 | Aprobado | Pruebas cubren ventanas UTC, límites semiabiertos y buckets vacíos. El 26-10-2026 se recorrieron en la interfaz 30 días, 12 meses y 5 años. En la consulta de 30 días, la ventana mostrada fue 2026-09-26T03:42:19.229Z–2026-10-26T03:42:19.229Z. |
| AC-03 | Aprobado | Fixtures verifican deduplicación, máximo, mediana, magnitud ausente y umbral inclusivo. En una muestra real de 30 días se observaron 9.859 eventos, magnitud máxima 7,7 y mediana 1,6; los filtros combinados de Sudamérica y magnitud ≥ 5 devolvieron 1 evento en 30 días, 44 en 12 meses y 316 en 5 años. |
| AC-04 | Aprobado | La respuesta real de producción indicó 9.861 registros esperados y recuperados. El total, la serie temporal, los grupos geográficos, la distribución de magnitud y la distribución de profundidad sumaron 9.861 cada uno. Las pruebas automatizadas también comprueban estas igualdades con fixtures. |
| AC-05 | Aprobado | Pruebas verifican todos los límites de magnitud y profundidad, categorías fuera de clase y valores ausentes sin convertirlos en cero. |
| AC-06 | Aprobado | Fixtures cubren país por geometría Natural Earth, océano, tierra sin país, fronteras, solapamientos, huecos, antimeridiano y coordenadas inválidas. La respuesta identifica Natural Earth Admin 0 Countries 1:110m v5.1.1 y Land 1:110m v4.0.0. |
| AC-07 | Aprobado | En producción, Tab y Enter seleccionaron Canadá desde el ranking y actualizaron la ficha. La ficha muestra eventos fuertes y recientes sin duplicados; el selector permite cambiar de país y “Cerrar ficha” la oculta sin reactivar la primera zona. |
| AC-08 | Aprobado | Tab y Espacio cambiaron el evento destacado. La ficha actualizó el lugar y el contexto tectónico; el texto identifica la distancia como proximidad geométrica y aclara que no determina la causa ni predice actividad. La procedencia enlaza al USGS. |
| AC-09 | Aprobado | A 375 × 812, scrollWidth y clientWidth fueron ambos 360 px; no hubo desplazamiento horizontal. Ranking, eventos y cierre funcionaron con teclado. Controles táctiles principales, zoom del mapa y cierre de ficha miden al menos 44 px de alto. El ranking conserva la alternativa de teclado al mapa. |
| AC-10 | Aprobado | Pruebas distinguen catálogo vacío, cero resultados por filtro, error de fuente, GeoJSON inválido, discrepancia de conteo y recuperación incompleta. En la interfaz, Sudamérica con magnitud ≥ 9 mostró el estado “Sin eventos en este período” y métricas ausentes como guion, sin confundirlo con error. |
| AC-11 | Aprobado | La vista muestra USGS, período, ámbito y filtros; el detalle expandible muestra ventana UTC, hora de recuperación, consulta, cobertura y versión geográfica. La respuesta real de producción reportó recuperación completa (9.861/9.861). |
| AC-12 | Aprobado | Revisión de textos y pruebas confirman que conteos y proximidad tectónica se presentan como observaciones, no como pronóstico, causalidad, daño ni evaluación de seguridad. |

## Verificaciones ejecutadas

- npm.cmd test — 72/72 pruebas aprobadas.
- npm.cmd run lint — aprobado.
- npx.cmd tsc --noEmit — aprobado.
- npm.cmd run build — aprobado. El primer intento tuvo un EPERM transitorio al crear una carpeta dentro de .next; confirmé que la ubicación aceptaba escritura y el segundo build terminó correctamente.
- Build de producción iniciado con npm.cmd run start -- --hostname 127.0.0.1 --port 3000; /analytics y su API respondieron HTTP 200.
- Navegador integrado en producción — 0 errores y 0 advertencias de consola en la revisión final.
- git diff --check — sin errores de whitespace.

## Fuentes

- [USGS FDSN Event Web Service](https://earthquake.usgs.gov/fdsnws/event/1/): catálogo sísmico consultado por la aplicación.
- [USGS Tectonic Plate Boundaries](https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer): contexto tectónico.
- [Natural Earth](https://www.naturalearthdata.com/downloads/): geometrías administrativas y de tierra versionadas en el proyecto.
