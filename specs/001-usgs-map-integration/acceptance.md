# Registro de aceptación T-08

**Fecha:** 2026-10-20
**Rama:** `feature/T-08-responsive-acceptance`
**Entorno:** aplicación local en `http://localhost:3002/`, navegador integrado.
**Especificación:** AC-01 a AC-10 de `specs/001-usgs-map-integration/spec.md`.

## Resultados

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| AC-01 | Aprobado | Monitor abrió en 24 horas con datos reales de USGS. La hora de generación del feed, la hora de recepción y la hora de origen del evento aparecen como datos distintos; el detalle identifica ART y UTC. |
| AC-02 | Aprobado | Monitor consultó hora, día y semana y actualizó resumen y enlace oficial (`all_hour.geojson`, `all_day.geojson`, `all_week.geojson`). En esta ejecución se observaron 6 eventos por hora y 1.801 por semana; el conteo diario varió durante la prueba porque el feed es dinámico. |
| AC-03 | Aprobado | El filtro Norteamérica mostró 169 eventos. Al combinarlo con magnitud mínima 2,0 mostró 52; los 10 eventos visibles cumplieron el umbral. Magnitud 9,9 mostró el estado de filtros sin resultados y nombró el filtro activo. Limpiar filtros restauró Todo el mundo y el feed sin umbral. |
| AC-04 | Aprobado | Mapa cargado con ubicaciones y leyenda de los siete rangos declarados; la atribución cartográfica permaneció visible. La selección de marcador y el zoom de grupos se verificaron al completar T-06. En T-08 se comprobó además el fallo y la recuperación independiente del mapa. |
| AC-05 | Aprobado | En Monitor e Historial, Enter sobre una fila abrió el detalle; Enter sobre “Volver a eventos” volvió a la lista. El detalle mostró hora local ART y UTC, profundidad, coordenadas, actualización y enlace oficial de USGS. |
| AC-06 | Aprobado con alcance documentado | El componente muestra una alerta solo cuando el evento incluye `alert`; no deduce peligro a partir de la magnitud. Los eventos reales seleccionados durante esta ejecución no incluían una alerta, por lo que la rama visual con alerta no tuvo un ejemplo de datos reales. |
| AC-07 | Aprobado | Las pruebas automatizadas cubren sondeo de 60 segundos solo en Monitor visible, actualización al volver a primer plano, actualización manual, conservación de la última respuesta y descarte de respuestas antiguas. Historial se actualizó manualmente en navegador durante T-07. |
| AC-08 | Aprobado | Se observó la carga inicial. Una respuesta local 502 mostró error recuperable y conservó los 1.801 eventos de Historial, con acción “Reintentar”. Un fixture local válido vacío mostró cero eventos y su mensaje propio. Un filtro sin coincidencias produjo un tercer estado distinto. Pruebas automatizadas cubren feed completamente inválido, red fallida y restauración del último período válido. |
| AC-09 | Aprobado | Historial consultó siete días y mostró 1.801 eventos, con los más recientes primero; permitía actualizar y abrir el detalle. La selección con teclado y el regreso a la lista también se probaron en viewport móvil. |
| AC-10 | Aprobado | A 375 × 812 px, Monitor e Historial no tuvieron overflow horizontal. Período, magnitud, continente, actualizar, limpiar, volver y zoom del mapa midieron al menos 44 × 44 px de alto/ancho requeridos. La lista abrió el detalle con teclado y el foco mostró un contorno sólido de 2 px. |

### Contraste observado

Muestras calculadas con los colores de interfaz y sus superficies: texto principal sobre fondo `17,49:1`, texto secundario sobre fondo `10,06:1` y texto terciario sobre panel `6,44:1`. Superan el mínimo WCAG AA de 4,5:1 para texto normal.

## Verificaciones automatizadas

- `npm.cmd test`: 22/22 pruebas aprobadas.
- `npm.cmd run lint`: aprobado.
- `npm.cmd run build`: compilación de producción y TypeScript aprobados.

## Simulaciones locales

Para recorrer estados que USGS no garantiza producir durante una sesión, se forzó temporalmente una respuesta 502 y luego un feed válido vacío en el route handler. Para el fallo cartográfico se apuntó temporalmente el estilo a un puerto local cerrado. En los tres casos se comprobó la interfaz en el navegador integrado. Se restauraron los archivos de producción después de cada recorrido y las verificaciones finales se ejecutaron con el código original.

Los conteos de USGS son instantáneas del 20-10-2026 y pueden variar en nuevas consultas.
